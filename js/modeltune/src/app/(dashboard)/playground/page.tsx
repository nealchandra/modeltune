import { Shell } from '@app/components/shell';
import { Textarea } from '@app/components/ui/textarea';

export default async function DashboardPage() {
  return (
    <Shell>
      <div className="hidden h-full flex-col md:flex">
        <Textarea
          value={<mark>Test</mark>}
          placeholder="What is a llama?"
          className="min-h-[400px] flex-1 p-4 md:min-h-[700px] lg:min-h-[700px]"
        />
      </div>
      {/* <DashboardHeader heading="Posts" text="Create and manage posts.">
        <PostCreateButton />
      </DashboardHeader> */}
    </Shell>
  );
}
