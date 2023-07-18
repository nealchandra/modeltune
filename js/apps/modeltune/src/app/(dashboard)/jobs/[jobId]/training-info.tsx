'use client';

import * as React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@app/components/ui/tabs';
import {
  Timeline,
  TimelineDescription,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from '@app/components/ui/timeline';

export const TrainingInfo: React.FC<{}> = ({}) => {
  const [timelineItems, setTimelineItems] = React.useState([
    {
      title: 'Job Started',
      time: '10:30:52',
      description: 'Created run on Weights & Biases',
    },
  ]);

  return (
    <Tabs defaultValue="timeline">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
      </TabsList>
      <TabsContent value="timeline">
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>
              Track the progress of your training job
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Timeline>
              <TimelineItem>
                <TimelineTime>10:30:52 </TimelineTime>
                <TimelineTitle>Job Started</TimelineTitle>
              </TimelineItem>
              <TimelineItem>
                <TimelineTime>10:30:52 </TimelineTime>
                <TimelineTitle>W&B: Run Created</TimelineTitle>
                <TimelineDescription>
                  Created run on Weights & Biases
                </TimelineDescription>
                <a
                  href="#"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-gray-200 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-700"
                >
                  Learn more{' '}
                  <svg
                    className="w-3 h-3 ml-2"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 10"
                  >
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M1 5h12m0 0L9 1m4 4L9 9"
                    />
                  </svg>
                </a>
              </TimelineItem>
            </Timeline>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="logs">
        <Card>
          <CardContent className="space-y-2">
            <pre className="break-words whitespace-pre-wrap">
              <p>{`neal test
{'loss': 0.1248, 'learning_rate': 0.00015, 'epoch': 1.0}
{'loss': 0.1248, 'learning_rate': 0.00015, 'epoch': 1.0}
100%|██████████| 2/2 [00:05&lt;00:00,  2.76s/it]
neal test
{'loss': 0.1237, 'learning_rate': 0.0, 'epoch': 2.0}
                                             
{'loss': 0.1237, 'learning_rate': 0.0, 'epoch': 2.0}
100%|██████████| 2/2 [00:05&lt;00:00,  2.76s/it]
neal test
{'train_runtime': 5.8964, 'train_samples_per_second': 6.784, 'train_steps_per_second': 0.339, 'total_flos': 29204113714176.0, 'train_loss': 0.1242656521499157, 'epoch': 2.0}
                                             
{'train_runtime': 5.8964, 'train_`}</p>
            </pre>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
