import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';
import { Extension } from 'fsh-sushi/dist/fshtypes';
import { AbstractSDProcessor } from './StructureDefinitionProcessor';

// TODO: ProfileProcessor and ExtensionProcessor may not be sufficiently different to justify
// having different classes. For now they're separate but we may want to combine them.
export class ExtensionProcessor extends AbstractSDProcessor {
  process(input: StructureDefinition): Extension {
    const extension = new Extension(input.name);
    super.extractKeywords(input, extension);
    return extension;
  }
}
