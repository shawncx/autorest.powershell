/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { Access, isAnExpression, toExpression } from '@azure-tools/codegen-csharp';
import { Expression, ExpressionOrLiteral } from '@azure-tools/codegen-csharp';
import { BackedProperty } from '@azure-tools/codegen-csharp';
import { OneOrMoreStatements } from '@azure-tools/codegen-csharp';
import { Variable } from '@azure-tools/codegen-csharp';
import { Property } from '../code-model';
import { EnhancedVariable } from '../extended-variable';
import { EnhancedTypeDeclaration } from '../schema/extended-type-declaration';


import { NewState, State } from '../generator';
import { ModelClass } from './model-class';
import { DeepPartial } from '@azure-tools/codegen';
import { KnownMediaType } from '@azure-tools/codemodel-v3';
import { Schema, SchemaType } from '@azure-tools/codemodel';

export class NewModelProperty extends BackedProperty implements EnhancedVariable {
  /** emits an expression to deserialize a property from a member inside a container */
  deserializeFromContainerMember(mediaType: KnownMediaType, container: ExpressionOrLiteral, serializedName: string): Expression {
    return this.typeDeclaration.deserializeFromContainerMember(mediaType, container, serializedName, this);
  }

  /** emits an expression to deserialze a container as the value itself. */
  deserializeFromNode(mediaType: KnownMediaType, node: ExpressionOrLiteral): Expression {
    return this.typeDeclaration.deserializeFromNode(mediaType, node, this);
  }

  /** emits an expression serialize this to the value required by the container */
  serializeToNode(mediaType: KnownMediaType, serializedName: string, mode: Expression): Expression {
    return this.typeDeclaration.serializeToNode(mediaType, this, serializedName, mode);
  }

  /** emits an expression serialize this to a HttpContent */
  serializeToContent(mediaType: KnownMediaType, mode: Expression): Expression {
    return this.typeDeclaration.serializeToContent(mediaType, this, mode);
  }

  /** emits the code required to serialize this into a container */
  serializeToContainerMember(mediaType: KnownMediaType, container: Variable, serializedName: string, mode: Expression): OneOrMoreStatements {
    return this.typeDeclaration.serializeToContainerMember(mediaType, container, this, serializedName, mode);
  }
  public validatePresenceStatement(eventListener: Variable): OneOrMoreStatements {
    if (this.required) {
      return (<EnhancedTypeDeclaration>this.type).validatePresence(eventListener, this);
    }
    return '';
  }
  public validationStatement(eventListener: Variable): OneOrMoreStatements {
    return (<EnhancedTypeDeclaration>this.type).validateValue(eventListener, this);
  }

  private required: boolean;
  // DISABLED
  // public IsHeaderProperty: boolean;
  public schema: Schema;
  public serializedName: string;
  private typeDeclaration: EnhancedTypeDeclaration;
  public details: any;

  constructor(name: string, schema: Schema, isRequired: boolean, serializedName: string, description: string, state: NewState, objectInitializer?: DeepPartial<NewModelProperty>) {
    const decl = state.project.modelsNamespace.NewResolveTypeDeclaration(schema, isRequired, state.path('schema'));
    super(name, decl);
    this.typeDeclaration = decl;
    this.serializedName = serializedName;
    this.schema = schema;
    // if (this.schema.readOnly) {
    //   this.set = undefined;
    // }
    this.apply(objectInitializer);
    this.description = description;
    this.required = isRequired;
    if (this.schema.type === SchemaType.Object && isAnExpression(this.get) && (<any>schema.language.csharp).classImplementation) {
      // for objects, the getter should auto-create a new object 
      this.get = toExpression(`(${this.get.value} = ${this.get.value} ?? new ${(<any>schema.language.csharp).fullname}())`);
    }
  }


}
