// rule-extractors are responsible for taking an element and extracting rules of a given type
// they should be given both a reference to the original element, and a clone that is dismantled as rules are extracted
export * from './CardRuleExtractor';
export * from './FixedValueRuleExtractor';
export * from './FlagRuleExtractor';
export * from './ValueSetRuleExtractor';
export * from './OnlyRuleExtractor';
export * from './ContainsRuleExtractor';
