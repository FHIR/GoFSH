import { Rule } from 'fsh-sushi/dist/fshtypes/rules';
import { Exportable } from '.';

export interface ExportableRule extends Exportable, Rule {}
