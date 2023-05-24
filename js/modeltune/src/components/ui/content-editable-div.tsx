'use client';

import * as React from 'react';

import { cn } from '@app/lib/utils';
import ContentEditable, {
  type Props as CEDivProps,
} from 'react-contenteditable';

export interface DivProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onChange: CEDivProps['onChange'];
  style?: Object;
}

const ContentEditableDiv = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => {
    return (
      <ContentEditable
        style={props.style || {}}
        html={props.value}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
ContentEditableDiv.displayName = 'ContentEditableDiv';

export { ContentEditableDiv };
