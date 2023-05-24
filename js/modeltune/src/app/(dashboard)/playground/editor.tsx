'use client';

import { Icons } from '@app/components/icons';
import { Button } from '@app/components/ui/button';
import { ContentEditableDiv } from '@app/components/ui/content-editable-div';

import { useModelPlayground } from './useModelPlayground';

export const Editor = () => {
  const { html, onChange, onSubmit } = useModelPlayground({});

  return (
    <div>
      <ContentEditableDiv
        value={html}
        onChange={(e) => onChange(e.target.value)}
        style={{
          whiteSpace: 'pre-wrap',
          display: 'inline-block',
        }}
        className="editor min-h-[400px] flex-1 p-4 md:min-h-[700px] lg:min-h-[700px]"
      />
      <Button size="sm" onClick={onSubmit}>
        <span>Submit</span>
      </Button>
    </div>
  );
};
