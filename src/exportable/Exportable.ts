import { ExportableCodeSystem } from './ExportableCodeSystem';
import { ExportableExtension } from './ExportableExtension';
import { ExportableInstance } from './ExportableInstance';
import { ExportableInvariant } from './ExportableInvariant';
import { ExportableMapping } from './ExportableMapping';
import { ExportableProfile } from './ExportableProfile';
import { ExportableValueSet } from './ExportableValueSet';

export interface Exportable {
  toFSH(): string;
}

export type NamedExportable =
  | ExportableProfile
  | ExportableExtension
  | ExportableValueSet
  | ExportableCodeSystem
  | ExportableInvariant
  | ExportableMapping
  | ExportableInstance;
