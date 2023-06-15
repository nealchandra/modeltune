import { Shell } from '@app/components/shell';
import * as z from 'zod';

import Tune from './tune';

export default function TuningPage() {
  return (
    <Shell>
      <div className="hidden h-full flex-col md:flex">
        <div className="grid gap-12 grid-cols-3">
          <Tune />
        </div>
      </div>
    </Shell>
  );
}
