'use client';

import React from 'react';

import { getDatasetRows } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@app/components/ui/alert';
import { Button } from '@app/components/ui/button';
import { Card, CardContent } from '@app/components/ui/card';
import { Label } from '@app/components/ui/label';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Mustache from 'mustache';

type DatasetPreviewProps = {
  dataset_id: string;
  prompt_template: string;
};

export const DatasetPreview = ({
  dataset_id,
  prompt_template,
}: DatasetPreviewProps) => {
  const [templateError, setTemplateError] = React.useState<boolean>(false);
  const [error, setError] = React.useState<boolean>(false);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState([]);
  const [selectedIdx, setSelectedIdx] = React.useState<number>(0);

  React.useEffect(() => {
    const updateRows = async () => {
      if (dataset_id) {
        const resp = await getDatasetRows(dataset_id);
        if (resp.error) {
          setError(true);
          return;
        }

        const rows = resp.rows.map((r: any) => r.row);
        setRows(rows);
        setError(false);
      }
    };
    updateRows();
  }, [dataset_id]);

  React.useEffect(() => {
    if (!rows.length) return;

    const previews = rows.map((row) => {
      try {
        return Mustache.render(prompt_template, row);
      } catch (e) {
        return null;
      }
    });

    if (previews.filter((p) => p !== null).length > 0) {
      setTemplateError(false);
      setPreviews(previews as string[]);
    } else {
      setTemplateError(true);
    }
  }, [prompt_template, rows]);

  return (
    <div>
      <Label>Dataset Preview</Label>
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Huggingface failed to return dataset preview.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card className="w-[350px] my-2 min-h-full min-w-full">
        <CardContent className="pt-4">
          <pre className="break-words whitespace-pre-wrap">
            {templateError ? (
              <p className="text-destructive">Error: Invalid prompt template</p>
            ) : (
              previews[selectedIdx]
            )}
          </pre>
        </CardContent>
      </Card>
      <Button
        variant="outline"
        size="icon"
        className="mr-2"
        disabled={selectedIdx === 0}
        onClick={() => setSelectedIdx((idx) => idx - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="mr-2"
        disabled={selectedIdx === 9}
        onClick={() => setSelectedIdx((idx) => idx + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
