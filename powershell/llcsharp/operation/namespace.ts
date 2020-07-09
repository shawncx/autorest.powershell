/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ImportDirective } from '@azure-tools/codegen-csharp';
import { Namespace } from '@azure-tools/codegen-csharp';
import { ClientRuntime } from '../clientruntime';
import { State, NewState } from '../generator';
import { DeepPartial } from '@azure-tools/codegen';

export class ServiceNamespace extends Namespace {
  constructor(public state: State | NewState, objectInitializer?: DeepPartial<ServiceNamespace>) {
    super(state instanceof NewState ? (<any>state.model.language.csharp)?.namespace : (<any>state.model.details.csharp).namespace || 'INVALID-NAMESPACE', state.project);
    this.apply(objectInitializer);
    this.add(new ImportDirective(`static ${ClientRuntime.Extensions}`));
  }

  get outputFolder() {
    return '';
  }
}
