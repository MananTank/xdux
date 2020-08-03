export const NO_INIT_VALUE_ERROR = sliceName => {
	throw new Error(`slice"${sliceName}" is missing initialState`);
};

export const NO_REACTOR = sliceName => {
	throw new Error(`"${sliceName}" is missing reactor function`);
};

export const INVALID_ACTION_TYPE_ERROR = (actionType, componentName) => {
	throw new Error(
		`INVALID ACTION TYPE: "${actionType}" in "${componentName}" Component\n` +
			`Either you misspelled it OR you forgot to add reducer for it`
	);
};

export const CYCLIC_DEPENDENCY_ERROR = sliceNames => {
	throw new Error(
		`ERROR: Cyclic Dependancy found involving slices:  ${sliceNames}. \nCheck the deps array of these slices and remove cyclic dependancy`
	);
};

export const INVALID_DEP_ERROR = (dep, sliceName) => {
	throw new Error(
		`invalid dependancy "${dep}" added in "${sliceName}". \nNo such slice exists in store.`
	);
};

export const BOTH_TYPE_OF_MUTATION_MADE = reducer => {
	throw new Error(
		`ERROR in reducer "${reducer}" \nYou can not do both immutable and mutative updates at once. \n\nEither don't return anything and perform mutative updates \n\nOR\n\nReturn the new value and perform no mutative updates`
	);
};

export const CAN_NOT_RETURN_UNDEFINED = sliceName => {
	throw new Error(
		`reactor of "${sliceName}" slice is returning undefined. reactor must return a value.\nIf you are returning undefined explicity in reactor(), this is not allowed. consider returning other falsy values`
	);
};
