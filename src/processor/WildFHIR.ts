// Represents FHIR we find out in the wild.  Usually collected in the LakeOfFHIR.  Similar to RawFSH in SUSHI.
export class WildFHIR {
  public readonly path: string;
  constructor(
    public readonly content: { resourceType?: string; [key: string]: any },
    path?: string
  ) {
    this.path = path ?? '';
  }
}
