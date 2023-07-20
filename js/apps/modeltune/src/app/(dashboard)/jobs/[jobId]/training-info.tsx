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

const TimelineStep: React.FC<
  React.PropsWithChildren<{ step: TrainingJobStep }>
> = ({ step }) => {
  const renderData = (step: TrainingJobStep) => {
    switch (step.type) {
      case 'JOB_STARTED':
        return (
          <>
            <TimelineTitle>Job started</TimelineTitle>
            <TimelineDescription>
              Job is in queue for training
            </TimelineDescription>
          </>
        );
      case 'JOB_FAILED':
        return (
          <>
            <TimelineTitle>Job failed</TimelineTitle>
            <TimelineDescription>Job has failed</TimelineDescription>
          </>
        );
      case 'JOB_CANCELLED':
        return (
          <>
            <TimelineTitle>Job cancelled</TimelineTitle>
            <TimelineDescription>Job was cancelled.</TimelineDescription>
          </>
        );
      case 'JOB_COMPLETED':
        return (
          <>
            <TimelineTitle>Job completed</TimelineTitle>
            <TimelineDescription>Job has completed.</TimelineDescription>
          </>
        );
      case 'PREPARING_DATASET':
        return (
          <>
            <TimelineTitle>Preparing dataset</TimelineTitle>
            <TimelineDescription>
              Preparing dataset for training
            </TimelineDescription>
          </>
        );
      case 'TRAINING_STARTED':
        return (
          <>
            <TimelineTitle>Training started</TimelineTitle>
            <TimelineDescription>Training has started</TimelineDescription>
          </>
        );
      case 'EPOCH_COMPLETED':
        return (
          <>
            <TimelineTitle>Epoch completed</TimelineTitle>
            <TimelineDescription>
              Epoch of training completed
            </TimelineDescription>
          </>
        );
      default:
        return <TimelineTitle>Job updated</TimelineTitle>;
    }
  };

  return (
    <TimelineItem>
      <TimelineTime>{step.createdAt.toTimeString()}</TimelineTime>
      {renderData(step)}
    </TimelineItem>
  );
};

const TrainingLogs: React.FC<{
  steps: TrainingJobStep[];
  logs: TrainingJobLog[];
}> = ({ steps, logs }) => {
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
              {steps.map((step) => (
                <TimelineStep key={step.id} step={step} />
              ))}
            </Timeline>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="logs">
        <Card>
          <CardContent className="space-y-2">
            <pre className="break-words whitespace-pre-wrap">
              {logs.map((log) => (
                <p key={log.id}>
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
  }, [isVisble, trainingJob?.status]);

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
