/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { codeModelSchema, ArraySchema, CodeModel, Schema as NewSchema, StringSchema, ObjectSchema, GroupSchema, isObjectSchema, SchemaType, GroupProperty, ParameterLocation, Operation, Parameter, VirtualParameter, getAllProperties, ImplementationLocation, OperationGroup, Request, SchemaContext } from '@azure-tools/codemodel';

import { ModelState, codemodel, IntegerFormat, NumberFormat, StringFormat, JsonType } from '@azure-tools/codemodel-v3';
import { Schema } from '../code-model';
import * as message from '../messages';
import { ArrayOf } from './array';
import { Binary } from './binary';
import { Boolean } from './boolean';
import { ByteArray } from './byte-array';
import { Char } from './char';
import { Date } from './date';
import { DateTime, DateTime1123, UnixTime } from './date-time';
import { Duration } from './duration';
import { EnumImplementation } from './enum';
import { Numeric } from './integer';
import { ObjectImplementation, NewObjectImplementation } from './object';
import { String, NewString } from './string';
import { Uuid } from './Uuid';
import { EnhancedTypeDeclaration } from './extended-type-declaration';
import { PwshModel } from '../../utils/PwshModel';
import { NewModelState } from '../../utils/model-state';
import { Channel, Host, Session, startSession } from '@azure-tools/autorest-extension-base';

export class SchemaDefinitionResolver {
  private readonly cache = new Map<string, EnhancedTypeDeclaration>();
  private add(schema: Schema, value: EnhancedTypeDeclaration): EnhancedTypeDeclaration {
    this.cache.set(schema.details.csharp.fullname || '', value);
    return value;
  }

  resolveTypeDeclaration(schema: Schema | undefined, required: boolean, state: ModelState<codemodel.Model>): EnhancedTypeDeclaration {
    if (!schema) {
      throw new Error('SCHEMA MISSING?');
    }

    // determine if we need a new model class for the type or just a known type object
    switch (schema.type) {
      case JsonType.Array: {
        // can be recursive!
        // handle boolean arrays as booleans (powershell will try to turn it into switches!)
        const elementType = (schema.items && schema.items.type === JsonType.Boolean) ? new Boolean(schema, true) : this.resolveTypeDeclaration(<Schema>schema.items, true, state.path('items'));
        return new ArrayOf(schema, required, elementType, schema.minItems, schema.maxItems, schema.uniqueItems);
      }

      case JsonType.Object: {
        const result = schema.details.csharp && this.cache.get(schema.details.csharp.fullname || '');
        if (result) {
          return result;
        }
        return this.add(schema, new ObjectImplementation(schema));
      }
      case JsonType.String:
        switch (schema.format) {
          case StringFormat.Base64Url:
          case StringFormat.Byte:
            // member should be byte array
            // on wire format should be base64url
            return new ByteArray(schema, required);

          case StringFormat.Binary:
            // represent as a stream
            // wire format is stream of bytes
            return new Binary(schema, required);

          case StringFormat.Char:
            // a single character
            return new Char(schema, required);

          case StringFormat.Date:
            return new Date(schema, required);

          case StringFormat.DateTime:
            return new DateTime(schema, required);

          case StringFormat.DateTimeRfc1123:
            return new DateTime1123(schema, required);

          case StringFormat.Duration:
            return new Duration(schema, required);

          case StringFormat.Uuid:
            return new Uuid(schema, required);

          case StringFormat.Url:
          case StringFormat.Password:
          case StringFormat.None:
          case undefined:
          case null:
            if (schema.extensions && schema.extensions['x-ms-enum']) {
              return new EnumImplementation(schema, required);
            }
            /*
            if(schema.extensions && schema.extensions['x-ms-header-collection-prefix']) {
              return new Wildcard(schema, new String(<any>{}, required));
            }
            */
            // just a regular old string.
            return new String(schema, required);

          default:
            state.warning(`Schema with type:'${schema.type} and 'format:'${schema.format}' is not recognized.`, message.DoesNotSupportEnum);
            return new String(schema, required);
        }

      case JsonType.Boolean:
        return new Boolean(schema, required);

      case JsonType.Integer:
        switch (schema.format) {
          case IntegerFormat.Int64:
          case IntegerFormat.None:
            return new Numeric(schema, required, required ? 'long' : 'long?');
          case IntegerFormat.UnixTime:
            return new UnixTime(schema, required);
          case IntegerFormat.Int32:
            return new Numeric(schema, required, required ? 'int' : 'int?');
        }
        // fallback to int if the format isn't recognized
        return new Numeric(schema, required, required ? 'int' : 'int?');

      case JsonType.Number:
        switch (schema.format) {
          case NumberFormat.None:
          case NumberFormat.Double:
            return new Numeric(schema, required, required ? 'double' : 'double?');
          case NumberFormat.Float:
            return new Numeric(schema, required, required ? 'float' : 'float?');
          case NumberFormat.Decimal:
            return new Numeric(schema, required, required ? 'decimal' : 'decimal?');
        }
        // fallback to float if the format isn't recognized
        return new Numeric(schema, required, required ? 'float' : 'float?');

      case undefined:
        if (schema.extensions && schema.extensions['x-ms-enum']) {
          return new EnumImplementation(schema, required);
        }

        // "any" case
        // this can happen when a model is just an all-of something else. (sub in the other type?)
        break;

    }
    state.error(`Schema '${schema.details.csharp.name}' is declared with invalid type '${schema.type}'`, message.UnknownJsonType);
    throw new Error('Unknown Model. Fatal.');
  }

}

export class NewSchemaDefinitionResolver {
  private readonly cache = new Map<string, EnhancedTypeDeclaration>();
  private add(schema: NewSchema, value: EnhancedTypeDeclaration): EnhancedTypeDeclaration {
    const csharp = <any>schema.language?.csharp;
    this.cache.set(csharp?.fullname || '', value);
    // this.cache.set(schema.language?.csharp?.fullname || '', value);
    return value;
  }

  resolveTypeDeclaration(schema: NewSchema | undefined, required: boolean, state: NewModelState<PwshModel>): EnhancedTypeDeclaration {
    if (!schema) {
      throw new Error('SCHEMA MISSING?');
    }
    const csharp = <any>schema.language.csharp;

    // determine if we need a new model class for the type or just a known type object
    switch (schema.type) {
      // case SchemaType.Array: {
      //   // can be recursive!
      //   // handle boolean arrays as booleans (powershell will try to turn it into switches!)
      //   const ar = <ArraySchema>schema;
      //   const elementType = (ar.elementType.type === SchemaType.Boolean) ? new Boolean(schema, true) : this.resolveTypeDeclaration(<Schema>schema.items, true, state.path('items'));
      //   return new ArrayOf(schema, required, elementType, ar.minItems, ar.maxItems, ar.uniqueItems);
      // }

      case SchemaType.Object: {
        const result = schema.language.csharp && this.cache.get(csharp.fullname || '');
        // const result = schema.language.csharp && this.cache.get(schema.language.csharp.fullname || '');
        if (result) {
          return result;
        }
        return this.add(schema, new NewObjectImplementation(schema));
      }
      case SchemaType.String: {
        return new NewString(<StringSchema>schema, required);

      }

      // case JsonType.Boolean:
      //   return new Boolean(schema, required);

      // case JsonType.Integer:
      //   switch (schema.format) {
      //     case IntegerFormat.Int64:
      //     case IntegerFormat.None:
      //       return new Numeric(schema, required, required ? 'long' : 'long?');
      //     case IntegerFormat.UnixTime:
      //       return new UnixTime(schema, required);
      //     case IntegerFormat.Int32:
      //       return new Numeric(schema, required, required ? 'int' : 'int?');
      //   }
      //   // fallback to int if the format isn't recognized
      //   return new Numeric(schema, required, required ? 'int' : 'int?');

      // case JsonType.Number:
      //   switch (schema.format) {
      //     case NumberFormat.None:
      //     case NumberFormat.Double:
      //       return new Numeric(schema, required, required ? 'double' : 'double?');
      //     case NumberFormat.Float:
      //       return new Numeric(schema, required, required ? 'float' : 'float?');
      //     case NumberFormat.Decimal:
      //       return new Numeric(schema, required, required ? 'decimal' : 'decimal?');
      //   }
      //   // fallback to float if the format isn't recognized
      //   return new Numeric(schema, required, required ? 'float' : 'float?');

      // case undefined:
      //   if (schema.extensions && schema.extensions['x-ms-enum']) {
      //     return new EnumImplementation(schema, required);
      //   }

      // "any" case
      // this can happen when a model is just an all-of something else. (sub in the other type?)
      case undefined:
        break;

    }
    state.error(`Schema '${csharp?.name}' is declared with invalid type '${schema.type}'`, message.UnknownJsonType);
    // state.error(`Schema '${schema.language.csharp?.name}' is declared with invalid type '${schema.type}'`, message.UnknownJsonType);
    throw new Error('Unknown Model. Fatal.');
  }
}