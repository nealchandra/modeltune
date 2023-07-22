import * as React from 'react';

export const Timeline: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <ol className="flex flex-col-reverse relative border-l border-gray-200 dark:border-gray-700">
      {children}
    </ol>
  );
};

export const TimelineItem: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return (
    <li className="animate-timeline-fade-in overflow-hidden	mb-10 ml-4">
      <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>
      {children}
    </li>
  );
};

export const TimelineTime: React.FC<React.PropsWithChildren> = ({
  children,
}) => (
  <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
    {children}
  </time>
);

export const TimelineTitle: React.FC<React.PropsWithChildren> = ({
  children,
}) => (
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
    {children}
  </h3>
);

export const TimelineDescription: React.FC<React.PropsWithChildren> = ({
  children,
}) => (
  <p className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">
    {children}
  </p>
);
