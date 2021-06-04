import path from 'path';
import fs from 'fs-extra';
import { fhirdefs, fshtypes } from 'fsh-sushi';
import {
  StructureDefinitionProcessor,
  ProcessableElementDefinition,
  ProcessableStructureDefinition
} from '../../src/processor';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableResource,
  ExportableLogical,
  ExportableCardRule,
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableObeysRule,
  ExportableContainsRule,
  ExportableAddElementRule,
  ExportableInvariant,
  ExportableBindingRule
} from '../../src/exportable';
import { loggerSpy } from '../helpers/loggerSpy';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
import { ContainsRuleExtractor } from '../../src/extractor';

describe('StructureDefinitionProcessor', () => {
  let defs: fhirdefs.FHIRDefinitions;
  let config: fshtypes.Configuration;

  beforeAll(() => {
    defs = loadTestDefinitions();
    defs.add(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'parent-observation.json'), 'utf-8')
      )
    );
    config = {
      canonical: 'http://hl7.org/fhir/sushi-test',
      fhirVersion: ['4.0.1']
    };
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('#process', () => {
    it('should convert the simplest Profile', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-profile.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ExportableProfile);
      expect(result[0].name).toBe('SimpleProfile');
    });

    it('should not create contains rules for slices that are not new', () => {
      const containsExtractorSpy = jest.spyOn(ContainsRuleExtractor, 'process');
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'child-observation.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ExportableProfile);
      // ChildObservation contains a differential element for:
      // Observation.component:alcoholAbuse.extension:conditionCode
      // and snapshot elements for:
      // Observation.component.extension:conditionCode
      // Observation.component:alcoholAbuse.extension
      // Observation.component.extension:conditionCode is in the snapshot because ParentObservation has already defined it.
      // therefore, there should not be a contains rule for Observation.component:alcoholAbuse.extension:conditionCode on ChildObservation
      const containsRule = result[0].rules.find(
        rule =>
          rule instanceof ExportableContainsRule &&
          rule.path === 'component[alcoholAbuse].extension'
      );
      expect(containsRule).toBeUndefined();
      // in fact, for this element, we should not have even called ContainsRuleExtractor,
      expect(containsExtractorSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'Observation.component:alcoholAbuse.extension:conditionCode'
        }),
        expect.anything(),
        expect.anything()
      );
    });

    it('should convert the simplest Extension', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-extension.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ExportableExtension);
      expect(result[0].name).toBe('SimpleExtension');
    });

    it('should convert a profile that has a baseDefinition', () => {
      // the baseDefinition field defines a Profile's Parent
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'big-profile.json'), 'utf-8')
      );
      const [profile] = StructureDefinitionProcessor.process(input, defs, config);

      expect(profile).toBeInstanceOf(ExportableProfile);
      expect(profile.name).toBe('BigProfile');
      expect(profile.parent).toBe('https://demo.org/StructureDefinition/SmallProfile');
    });

    it('should convert a profile with an invariant', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);
      const profiles = result.filter(resource => resource instanceof ExportableProfile);
      const invariants = result.filter(resource => resource instanceof ExportableInvariant);

      expect(profiles).toHaveLength(1);
      expect(invariants).toHaveLength(1);
    });

    it('should create an invariant for the first instance of a constraint key and caret value rules for other instances of that constraint key', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'reused-invariant-profile.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);
      const invariants = result.filter(resource => resource instanceof ExportableInvariant);
      const profile = result.find(
        resource => resource instanceof ExportableProfile
      ) as ExportableProfile;
      const onlyInvariant = new ExportableInvariant('myo-1');
      onlyInvariant.description = 'First appearance of invariant with key myo-1.';
      onlyInvariant.severity = new fshtypes.FshCode('warning');
      const obeysRule = new ExportableObeysRule('note');
      obeysRule.keys = ['myo-1'];
      const constraintKey = new ExportableCaretValueRule('method');
      constraintKey.caretPath = 'constraint[1].key';
      constraintKey.value = 'myo-1';
      const constraintSeverity = new ExportableCaretValueRule('method');
      constraintSeverity.caretPath = 'constraint[1].severity';
      constraintSeverity.value = new fshtypes.FshCode('warning');
      const constraintHuman = new ExportableCaretValueRule('method');
      constraintHuman.caretPath = 'constraint[1].human';
      constraintHuman.value = 'Second appearance of invariant with key myo-1.';

      expect(invariants).toHaveLength(1);
      expect(invariants).toContainEqual(onlyInvariant);
      expect(profile.rules).toContainEqual(obeysRule);
      expect(profile.rules).toContainEqual(constraintKey);
      expect(profile.rules).toContainEqual(constraintSeverity);
      expect(profile.rules).toContainEqual(constraintHuman);
    });

    it('should not convert a Profile without a name or id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-profile.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(0);
    });

    // NOTE: name is required on StructureDefinitions. This case is designed to do our best to handle invalid FHIR.
    it('should convert a Profile without a name but with an id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-profile-with-id.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ExportableProfile);
      expect(result[0].name).toBe('MyProfile1');
      expect(result[0].id).toBe('my.profile-1');
    });

    it('should not convert an Extension without a name', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-extension.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(0);
    });

    it('should convert a Profile whose name includes whitespace', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-profile.json'), 'utf-8')
      );
      input.name = 'Simple Profile';
      const result = StructureDefinitionProcessor.process(input, defs, config);

      const expectedNameRule = new ExportableCaretValueRule('');
      expectedNameRule.caretPath = 'name';
      expectedNameRule.value = 'Simple Profile';

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ExportableProfile);
      expect(result[0].name).toBe('Simple_Profile');
      expect(result[0].rules).toContainEqual(expectedNameRule);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'StructureDefinition with id simple.profile has name with whitespace. Converting whitespace to underscores.'
      );
    });

    it('should convert the simplest Resource', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-resource.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ExportableResource);
      expect(result[0].name).toBe('SimpleResource');
    });

    it('should not convert a Resource without a name or id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-resource.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(0);
    });

    it('should convert the simplest Logical', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-logical.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ExportableLogical);
      expect(result[0].name).toBe('SimpleLogical');
    });

    it('should not convert a Logical without a name or id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-logical.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs, config);

      expect(result).toHaveLength(0);
    });
  });

  describe('#extractKeywords', () => {
    it('should get keywords for a Profile with simple metadata', () => {
      // simple metadata fields are Id, Title, and Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-profile.json'), 'utf-8')
      );
      const workingProfile = new ExportableProfile(input.name);
      StructureDefinitionProcessor.extractKeywords(input, workingProfile);

      expect(workingProfile.id).toBe('my-profile');
      expect(workingProfile.title).toBe('My New Profile');
      expect(workingProfile.description).toBe('This is my new Profile. Thank you.');
    });

    it('should get keywords for an Extension with simple metadata', () => {
      // simple metadata fields are Id, Title, and Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-extension.json'), 'utf-8')
      );
      const workingExtension = new ExportableExtension(input.name);
      StructureDefinitionProcessor.extractKeywords(input, workingExtension);

      expect(workingExtension.id).toBe('my-extension');
      expect(workingExtension.title).toBe('My New Extension');
      expect(workingExtension.description).toBe('This is my new Extension. Thank you.');
    });

    it('should get keywords for a Resource with simple metadata', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-resource.json'), 'utf-8')
      );
      const workingResource = new ExportableResource(input.name);
      StructureDefinitionProcessor.extractKeywords(input, workingResource);

      expect(workingResource.id).toBe('my-resource');
      expect(workingResource.title).toBe('My New Resource');
      expect(workingResource.description).toBe('This is my new resource.');
    });

    it('should get keywords for a Logical with simple metadata', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-logical.json'), 'utf-8')
      );
      const workingLogical = new ExportableLogical(input.name);
      StructureDefinitionProcessor.extractKeywords(input, workingLogical);

      expect(workingLogical.id).toBe('my-logical');
      expect(workingLogical.title).toBe('My Logical Model');
      expect(workingLogical.description).toBe('This is my fancy new logical model.');
    });
  });

  describe('#extractRules', () => {
    it('should add rules to a Profile', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      // these paths would be processed by the InvariantExtractor
      elements[2].processedPaths.push(
        'constraint[0].key',
        'constraint[0].human',
        'constraint[0].severity'
      );
      // these paths would be processed by the MappingExtractor
      elements[0].processedPaths.push(
        'mapping[0].identity',
        'mapping[0].map',
        'mapping[0].comment',
        'mapping[0].language'
      );
      elements[3].processedPaths.push(
        'mapping[0].identity',
        'mapping[0].map',
        'mapping[0].comment',
        'mapping[0].language'
      );
      const workingProfile = new ExportableProfile('MyObservation');
      StructureDefinitionProcessor.extractRules(input, elements, workingProfile, defs, config);
      const cardRule = new ExportableCardRule('valueString');
      cardRule.min = 1;
      const assignmentRule = new ExportableAssignmentRule('valueString');
      assignmentRule.value = 'foo';
      const caretRule = new ExportableCaretValueRule('valueString');
      caretRule.caretPath = 'short';
      caretRule.value = 'bar';
      const obeysRule = new ExportableObeysRule('note');
      obeysRule.keys = ['myo-1'];

      expect(workingProfile.rules.length).toBe(4);
      expect(workingProfile.rules).toContainEqual<ExportableCardRule>(cardRule);
      expect(workingProfile.rules).toContainEqual<ExportableAssignmentRule>(assignmentRule);
      expect(workingProfile.rules).toContainEqual<ExportableCaretValueRule>(caretRule);
      expect(workingProfile.rules).toContainEqual<ExportableObeysRule>(obeysRule);
    });

    it('should add rules to an Extension', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-extension.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const workingExtension = new ExportableExtension('MyExtension');
      StructureDefinitionProcessor.extractRules(input, elements, workingExtension, defs, config);
      const assignmentRule = new ExportableAssignmentRule('url');
      assignmentRule.value = 'https://go.fsh/StructureDefinition/my-extension';
      assignmentRule.exactly = true;

      expect(workingExtension.rules.length).toBe(1);
      expect(workingExtension.rules).toContainEqual<ExportableAssignmentRule>(assignmentRule);
    });

    it('should add rules to a Resource', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-resource.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const workingResource = new ExportableResource('MyResource');
      StructureDefinitionProcessor.extractRules(input, elements, workingResource, defs, config);
      expect(workingResource.rules).toHaveLength(4);
      // caret value rule that sets the url
      const urlCaretRule = new ExportableCaretValueRule('');
      urlCaretRule.caretPath = 'url';
      urlCaretRule.value = 'http://example.org/tests/StructureDefinition/my-resource';
      // add an element for MyResource.bread
      const breadElementRule = new ExportableAddElementRule('bread');
      breadElementRule.short = 'Bread type';
      breadElementRule.definition =
        'Each instance of this resource contains exactly one type of bread.';
      breadElementRule.mustSupport = true;
      breadElementRule.summary = true;
      breadElementRule.min = 1;
      breadElementRule.max = '1';
      breadElementRule.types = [
        {
          type: 'code'
        }
      ];
      // binding for MyResource.bread
      const breadBindingRule = new ExportableBindingRule('bread');
      breadBindingRule.strength = 'preferred';
      breadBindingRule.valueSet = 'http://example.org/ValueSet/breads|1.3';
      // add an element for MyResource.fruit
      const fruitElementRule = new ExportableAddElementRule('fruit');
      fruitElementRule.short = 'Fruit type';
      fruitElementRule.definition =
        'Each instance of this resource contains at least one type of fruit.';
      fruitElementRule.min = 1;
      fruitElementRule.max = '*';
      fruitElementRule.types = [{ type: 'string' }];
      expect(workingResource.rules[0]).toEqual(urlCaretRule);
      expect(workingResource.rules[1]).toEqual(breadElementRule);
      expect(workingResource.rules[2]).toEqual(breadBindingRule);
      expect(workingResource.rules[3]).toEqual(fruitElementRule);
    });

    it('should add rules to a Logical', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-logical.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      // these paths would have been processed by the InvariantExtractor
      elements[2].processedPaths.push(
        'constraint[0].key',
        'constraint[0].human',
        'constraint[0].severity'
      );
      const workingLogical = new ExportableResource('MyLogical');
      StructureDefinitionProcessor.extractRules(input, elements, workingLogical, defs, config);
      expect(workingLogical.rules).toHaveLength(5);
      // a caret rule for kind: this can get removed by optimizer later, but is technically fine
      const logicalKindRule = new ExportableCaretValueRule('');
      logicalKindRule.caretPath = 'kind';
      logicalKindRule.value = new fshtypes.FshCode('logical');
      // add an element for MyLogical.bag
      const bagElementRule = new ExportableAddElementRule('bag');
      bagElementRule.short = 'A bag for holding things';
      bagElementRule.min = 0;
      bagElementRule.max = '*';
      bagElementRule.types = [{ type: 'BackboneElement' }];
      // add an element for MyLogical.bag.capacity
      const capacityElementRule = new ExportableAddElementRule('bag.capacity');
      capacityElementRule.short = 'The amount held';
      capacityElementRule.min = 1;
      capacityElementRule.max = '1';
      capacityElementRule.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/SimpleQuantity'
        }
      ];
      // add a constraint for MyLogical.bag.capacity
      const capacityObeysRule = new ExportableObeysRule('bag.capacity');
      capacityObeysRule.keys = ['bag-1'];
      // add an element for MyLogical.bag.material
      const materialElementRule = new ExportableAddElementRule('bag.material');
      materialElementRule.short = 'Physical composition of the bag';
      materialElementRule.definition = 'Physical composition of the bag';
      materialElementRule.min = 1;
      materialElementRule.max = '*';
      materialElementRule.types = [
        {
          type: 'string'
        },
        {
          type: 'http://example.org/StructureDefinition/Material',
          isReference: true
        }
      ];
      expect(workingLogical.rules[0]).toEqual(logicalKindRule);
      expect(workingLogical.rules[1]).toEqual(bagElementRule);
      expect(workingLogical.rules[2]).toEqual(capacityElementRule);
      expect(workingLogical.rules[3]).toEqual(capacityObeysRule);
      expect(workingLogical.rules[4]).toEqual(materialElementRule);
    });

    it('should add rules to a Profile with a new slice', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'new-slice-profile.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const workingProfile = new ExportableProfile('MyObservation');
      StructureDefinitionProcessor.extractRules(input, elements, workingProfile, defs, config);
      const containsRule = new ExportableContainsRule('category');
      containsRule.items = [{ name: 'Foo' }];
      const cardRule = new ExportableCardRule('category[Foo]');
      cardRule.min = 1;
      cardRule.max = '*';
      containsRule.cardRules.push(cardRule);

      expect(workingProfile.rules).toEqual([containsRule]);
    });

    it('should add rules to a Profile with an existing slice', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'existing-slice-profile.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const workingProfile = new ExportableProfile('MyObservation');
      StructureDefinitionProcessor.extractRules(input, elements, workingProfile, defs, config);
      const cardRule = new ExportableCardRule('category[VSCat]');
      cardRule.min = 1;
      cardRule.max = '1';

      expect(workingProfile.rules).toEqual([cardRule]);
    });

    it('should run switchQuantityRules while extracting rules', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'extension-with-rules.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];

      // Within the input JSON valueQuantity.unit is set prior to valueQuantity as a whole
      expect(input.differential.element[1].path).toEqual('Extension.valueQuantity.unit');
      expect(input.differential.element[2].path).toEqual('Extension.valueQuantity');

      const workingExtension = new ExportableExtension('MyExtension');
      StructureDefinitionProcessor.extractRules(input, elements, workingExtension, defs, config);

      expect(workingExtension.rules[5].path).toEqual('valueQuantity');
      expect(workingExtension.rules[6].path).toEqual('valueQuantity.unit');
    });
  });

  describe('#extractInvariants', () => {
    it('should return a list containing the invariants for all elements', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '..', 'extractor', 'fixtures', 'obeys-profile.json'),
          'utf-8'
        )
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const result = StructureDefinitionProcessor.extractInvariants(input, elements, []);

      expect(result).toHaveLength(4);
    });
  });

  describe('#extractMappings', () => {
    it('should convert a profile with a mapping', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const mappings = StructureDefinitionProcessor.extractMappings(elements, input, defs);

      expect(mappings).toHaveLength(1);
    });
  });
});
