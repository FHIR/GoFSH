import { ExportableInstance } from '../../src/exportable';

export function assertExportableInstance(
  instance: ExportableInstance,
  id: ExportableInstance['id'],
  instanceOf: ExportableInstance['instanceOf'],
  usage: ExportableInstance['usage'],
  title: ExportableInstance['title'],
  description: ExportableInstance['description'],
  rules: ExportableInstance['rules']
): void {
  expect(instance.id).toBe(id);
  expect(instance.instanceOf).toBe(instanceOf);
  expect(instance.usage).toBe(usage);
  expect(instance.title).toBe(title);
  expect(instance.description).toBe(description);
  expect(instance.rules).toEqual(rules);
}
