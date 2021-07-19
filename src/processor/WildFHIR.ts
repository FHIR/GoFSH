// Represents FHIR we find out in the wild.  Usually collected in the LakeOfFHIR.  Similar to RawFSH in SUSHI.
export class WildFHIR {
  public readonly path: string;
  public readonly large: boolean;
  public readonly content: FHIRResource;

  constructor(file: FileImport, path?: string) {
    this.content = file.content;
    this.path = path ?? '';
    this.large = file.large ?? false;
  }
}

export type FileImport = { content: FHIRResource; large?: boolean };
export type FHIRResource = { resourceType?: string; [key: string]: any };
