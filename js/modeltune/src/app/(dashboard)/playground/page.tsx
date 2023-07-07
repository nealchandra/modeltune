import { Shell } from '@app/components/shell';

import { Editor } from './editor';

export default function PlaygroundPage() {
  return (
    <Shell>
      <div className="hidden h-full flex-col md:flex">
        <Editor />
      </div>
    </Shell>
  );
}
