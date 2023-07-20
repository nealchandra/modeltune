'use client';

import * as React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import { Skeleton } from '@app/components/ui/skeleton';
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
import {
  Prisma,
  TrainingJob,
  TrainingJobLog,
  TrainingJobStatus,
  TrainingJobStep,
} from '@prisma/client';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

const TrainingLogs: React.FC<{
  steps: TrainingJobStep[];
  logs: TrainingJobLog[];
}> = ({ steps, logs }) => {
  console.log(steps);

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
              {/* <TimelineItem>
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
              </TimelineItem> */}
            </Timeline>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="logs">
        <Card>
          <CardContent className="space-y-2">
            <pre className="break-words whitespace-pre-wrap">
              {logs.map((log) => (
                <p>
                  <strong>{log.createdAt.toTimeString()}</strong>
                  {log.content}
                </p>
              ))}
            </pre>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export const TrainingChart: React.FC<
  React.PropsWithChildren<{
    job: TrainingJob;
  }>
> = ({ job }) => (
  <ResponsiveContainer width="100%" maxHeight={500}>
    <LineChart
      data={[
        {
          name: 'Page A',
          uv: 4000,
          pv: 2400,
          amt: 2400,
        },
        {
          name: 'Page B',
          uv: 3000,
          pv: 1398,
          amt: 2210,
        },
        {
          name: 'Page C',
          uv: 2000,
          pv: 9800,
          amt: 2290,
        },
        {
          name: 'Page D',
          uv: 2780,
          pv: 3908,
          amt: 2000,
        },
        {
          name: 'Page E',
          uv: 1890,
          pv: 4800,
          amt: 2181,
        },
        {
          name: 'Page F',
          uv: 2390,
          pv: 3800,
          amt: 2500,
        },
        {
          name: 'Page G',
          uv: 3490,
          pv: 4300,
          amt: 2100,
        },
      ]}
    >
      <XAxis dataKey="name" />
      <YAxis />
      <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
      <Line type="monotone" dataKey="uv" stroke="#8884d8" />
    </LineChart>
  </ResponsiveContainer>
);

type FullTrainingJob = Prisma.TrainingJobGetPayload<{
  include: { logs: true; steps: true };
}>;

export const TrainingInfo: React.FC<
  React.PropsWithChildren<{
    fetchTrainingJob: () => Promise<FullTrainingJob>;
  }>
> = ({ fetchTrainingJob }) => {
  const [trainingJob, setTrainingJob] = React.useState<FullTrainingJob>();
  const [isVisible, setIsVisible] = React.useState(true);
  const onVisibilityChange = () => setIsVisible(!document.hidden);

  React.useEffect(() => {
    document.addEventListener('visibilitychange', onVisibilityChange, false);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });

  const updateTrainingJob = async () => {
    const job = await fetchTrainingJob();
    setTrainingJob(job);
  };

  React.useEffect(() => {
    updateTrainingJob();

    const interval = setInterval(async () => {
      if (
        isVisible &&
        trainingJob?.status !== TrainingJobStatus.COMPLETED &&
        trainingJob?.status !== TrainingJobStatus.FAILED
      ) {
        updateTrainingJob();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!trainingJob) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  return (
    <>
      <TrainingChart job={trainingJob} />
      <TrainingLogs steps={trainingJob.steps} logs={trainingJob.logs} />
    </>
  );
};
