type SubscriptionFilterValue = string | number;
export interface SubscriptionFilterGeneric {
    fieldName: string;
    operator: string;
    value: SubscriptionFilterValue | boolean | SubscriptionFilterValue[];
}
export interface SubscriptionFilterEquality extends SubscriptionFilterGeneric {
    operator: 'eq' | 'ne';
    value: SubscriptionFilterValue | boolean;
}
export interface SubscriptionFilterComparator extends SubscriptionFilterGeneric {
    operator: 'le' | 'lt' | 'ge' | 'gt';
    value: SubscriptionFilterValue;
}
export interface SubscriptionFilterContains extends SubscriptionFilterGeneric {
    operator: 'contains' | 'notContains';
    value: SubscriptionFilterValue;
}
export interface SubscriptionFilterBeginsWith extends SubscriptionFilterGeneric {
    operator: 'beginsWith';
    value: string;
}
export interface SubscriptionFilterIn extends SubscriptionFilterGeneric {
    operator: 'in' | 'notIn';
    value: SubscriptionFilterValue[];
}
export interface SubscriptionFilterBetween extends SubscriptionFilterGeneric {
    operator: 'between';
    value: [SubscriptionFilterValue, SubscriptionFilterValue];
}
export type SubscriptionFilterEntry = SubscriptionFilterEquality | SubscriptionFilterComparator | SubscriptionFilterContains | SubscriptionFilterBeginsWith | SubscriptionFilterIn | SubscriptionFilterBetween;
export type SubscriptionFilterGroup = {
    filters: SubscriptionFilterEntry[];
};
export type SubscriptionFilter = {
    filterGroup: SubscriptionFilterGroup[];
};
export {};
//# sourceMappingURL=subscription-filter-types.d.ts.map