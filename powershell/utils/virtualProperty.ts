import { Property, Schema } from "@azure-tools/codemodel";


export interface VirtualProperty {
  /** The property that this represents */
  property: Property;
  /** The things that went into building the name */
  nameComponents: Array<string>;
  /** Names To use in priority order */
  nameOptions: Array<string>;
  /** the name of this virtual property */
  name: string;
  /** the member that should be called to get to the virtual property. (may be recursive) */
  accessViaProperty?: VirtualProperty;
  accessViaMember?: VirtualProperty;
  /** the member's schema */
  accessViaSchema?: Schema;
  originalContainingSchema: Schema;
  private?: boolean;
  alias: Array<string>;
  description: string;
  format?: PropertyFormat;
  required: boolean;
  sharedWith?: Array<VirtualProperty>;
}


interface PropertyFormat {
  suppressFormat?: boolean;
  index?: number;
  width?: number;
  label?: string;
}

export interface VirtualProperties {
  owned: Array<VirtualProperty>;
  inherited: Array<VirtualProperty>;
  inlined: Array<VirtualProperty>;
}