import {
  ExportableExtension,
  ExportableProfile,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableInvariant,
  ExportableConfiguration
} from '../exportable';
import { FHIRProcessor } from './FHIRProcessor';
import ResolveProfileParentsOptimizer from '../optimizer/plugins/ResolveParentURLsOptimizer';
import CombineCardAndFlagRulesOptimizer from '../optimizer/plugins/CombineCardAndFlagRulesOptimizer';
import ConstructNamedExtensionContainsRulesOptimizer from '../optimizer/plugins/ConstructNamedExtensionContainsRulesOptimizer';
import RemoveChoiceSlicingRulesOptimizer from '../optimizer/plugins/RemoveChoiceSlicingRulesOptimizer';
import RemoveDefaultExtensionContextRulesOptimizer from '../optimizer/plugins/RemoveDefaultExtensionContextRulesOptimizer';
import RemoveImpliedZeroZeroCardRulesOptimizer from '../optimizer/plugins/RemoveImpliedZeroZeroCardRulesOptimizer';
import RemoveExtensionURLAssignmentRules from '../optimizer/plugins/RemoveExtensionURLAssignmentRules';
import RemoveExtensionSlicingRulesOptimizer from '../optimizer/plugins/RemoveExtensionSlicingRulesOptimizer';
import RemovePublisherDerivedDateRulesOptimizer from '../optimizer/plugins/RemovePublisherDerivedDateRulesOptimizer';
import CombineContainsRulesOptimizer from '../optimizer/plugins/CombineContainsRulesOptimizer';
import ResolveOnlyRuleURLsOptimizer from '../optimizer/plugins/ResolveOnlyRuleURLsOptimizer';
import { logger } from '../utils';

export class Package {
  public readonly profiles: ExportableProfile[] = [];
  public readonly extensions: ExportableExtension[] = [];
  public readonly instances: ExportableInstance[] = [];
  public readonly valueSets: ExportableValueSet[] = [];
  public readonly codeSystems: ExportableCodeSystem[] = [];
  public readonly invariants: ExportableInvariant[] = [];
  public configuration: ExportableConfiguration;

  constructor() {}

  add(
    resource:
      | ExportableProfile
      | ExportableExtension
      | ExportableInstance
      | ExportableValueSet
      | ExportableCodeSystem
      | ExportableInvariant
      | ExportableConfiguration
  ) {
    if (resource instanceof ExportableProfile) {
      this.profiles.push(resource);
    } else if (resource instanceof ExportableExtension) {
      this.extensions.push(resource);
    } else if (resource instanceof ExportableInstance) {
      this.instances.push(resource);
    } else if (resource instanceof ExportableValueSet) {
      this.valueSets.push(resource);
    } else if (resource instanceof ExportableCodeSystem) {
      this.codeSystems.push(resource);
    } else if (resource instanceof ExportableInvariant) {
      this.invariants.push(resource);
    } else if (resource instanceof ExportableConfiguration) {
      if (this.configuration) {
        logger.warn(
          `Multiple implementation guide resources found in input folder. Skipping implementation guide with canonical ${resource.config.canonical}`
        );
      } else {
        this.configuration = resource;
      }
    }
  }

  optimize(processor: FHIRProcessor) {
    logger.debug('Optimizing FSH definitions...');
    RemoveChoiceSlicingRulesOptimizer.optimize(this);
    RemoveDefaultExtensionContextRulesOptimizer.optimize(this);
    RemoveImpliedZeroZeroCardRulesOptimizer.optimize(this);
    RemoveExtensionURLAssignmentRules.optimize(this);
    RemoveExtensionSlicingRulesOptimizer.optimize(this);
    RemovePublisherDerivedDateRulesOptimizer.optimize(this);
    ResolveProfileParentsOptimizer.optimize(this, processor);
    ResolveOnlyRuleURLsOptimizer.optimize(this, processor);
    ConstructNamedExtensionContainsRulesOptimizer.optimize(this);
    CombineContainsRulesOptimizer.optimize(this);
    CombineCardAndFlagRulesOptimizer.optimize(this);
  }
}
