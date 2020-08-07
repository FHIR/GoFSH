import { ExportableExtension } from '../exportable';
import { AbstractSDProcessor } from './StructureDefinitionProcessor';

// TODO: ProfileProcessor and ExtensionProcessor may not be sufficiently different to justify
// having different classes. For now they're separate but we may want to combine them.
export class ExtensionProcessor extends AbstractSDProcessor {
  static process(input: any): ExportableExtension {
    if (ExtensionProcessor.isProcessableStructureDefinition(input)) {
      const extension = new ExportableExtension(input.name);
      ExtensionProcessor.extractKeywords(input, extension);
      ExtensionProcessor.extractRules(input, extension);
      return extension;
    }
  }
}
