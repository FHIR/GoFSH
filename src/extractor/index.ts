// rule-extractors are responsible for taking an element and extracting rules of a given type
// they should be given both a reference to the original element, and a clone that is dismantled as rules are extracted
export * from './CardRuleExtractor';
export * from './AssignmentRuleExtractor';
export * from './FlagRuleExtractor';
export * from './BindingRuleExtractor';
export * from './OnlyRuleExtractor';
export * from './CaretValueRuleExtractor';
export * from './ContainsRuleExtractor';
export * from './ObeysRuleExtractor';

// non-rule extractors
export * from './InvariantExtractor';
