import { ExportableCodeSystem } from './ExportableCodeSystem';
import { ExportableExtension } from './ExportableExtension';
import { ExportableInstance } from './ExportableInstance';
import { ExportableInvariant } from './ExportableInvariant';
import { ExportableMapping } from './ExportableMapping';
import { ExportableProfile } from './ExportableProfile';
import { ExportableValueSet } from './ExportableValueSet';
import { ExportableResource } from './ExportableResource';
import { ExportableLogical } from './ExportableLogical';

export interface Exportable {
  toFSH(): string;
}

export type NamedExportable =
  | ExportableProfile
  | ExportableExtension
  | ExportableResource
  | ExportableLogical
  | ExportableValueSet
  | ExportableCodeSystem
  | ExportableInvariant
  | ExportableMapping
  | ExportableInstance;
