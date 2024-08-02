// CustomOption.js
import React from 'react';
import { FlagIcon } from 'react-flag-kit';

const CustomOption = (props) => {
    const { data, innerRef, innerProps } = props;

    return (
        <div
            ref={innerRef}
            {...innerProps}
            style={{ display: 'flex', alignItems: 'center', padding: '8px' }}
        >
            <FlagIcon code={data.flag} size={20} style={{ marginRight: 10 }} />
            {data.label}
        </div>
    );
};

export default CustomOption;
