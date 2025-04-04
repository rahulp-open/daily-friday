import React, { useState } from 'react';
import ForgeReconciler, { Text, Button, LoadingButton, Inline } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    const response = await invoke('getSummary');
    setComments(response.comments || []);
    setLoading(false);
  };

  const fetchSummary = async () => {
    setLoading(true);
    const response = await invoke('getComments');
    setComments(response.comments || []);
    setLoading(false);
  };


  return (
    <>
      <Inline space="space.200">
        <LoadingButton isLoading={loading} onClick={fetchComments}  >View Today's Updates</LoadingButton>
        <LoadingButton isLoading={loading} onClick={fetchSummary}  > Summarize </LoadingButton>
      </Inline>
     
      {loading ? (
        <Text></Text>
      ) : (
        comments.length > 0 ? (
          comments.map((comment, index) => <Text key={index}>{ comment }</Text>)
        ) : (
          <Text>Data not found</Text>
        )
      )}
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
