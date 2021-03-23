import { fshtypes } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableAssignmentRule } from '../../exportable';
import { MasterFisher } from '../../utils';
import AddReferenceKeywordOptimizer from './AddReferenceKeywordOptimizer';

export default {
  name: 'resolve_reference_assignments_optimizer',
  description: 'Resolves values in reference assignment rules if possible',
  runAfter: [AddReferenceKeywordOptimizer.name],

  optimize(pkg: Package, fisher: MasterFisher): void {
    pkg.instances.forEach(instance => {
      instance.rules
        .filter(
          rule =>
            rule instanceof ExportableAssignmentRule && rule.value instanceof fshtypes.FshReference
        )
        .forEach((rule: ExportableAssignmentRule) => {
          const reference = rule.value as fshtypes.FshReference;
          const splitReference = reference.reference.split('/');
          if (splitReference.length === 2) {
            const [resourceType, name] = splitReference;
            const matchingInstances = pkg.instances.filter(i => {
              return (
                i.name === name &&
                fisher.fishForStructureDefinition(i.instanceOf)?.type === resourceType
              );
            });
            if (matchingInstances.length === 1) {
              reference.reference = name;
            }
          }
        });
    });
  }
} as OptimizerPlugin;
