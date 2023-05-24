import { Shell } from '@app/components/shell';

import { Editor } from './editor';

export default async function DashboardPage() {
  return (
    <Shell>
      <div className="hidden h-full flex-col md:flex">
        <Editor />
      </div>
    </Shell>
  );
}
