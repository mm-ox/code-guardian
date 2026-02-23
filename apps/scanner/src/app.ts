import express from 'express';
import { runTrivyScan } from './trivy-scanner';

const app = express();

app.use(express.json());

app.post('/scan', (req, res) => {
  const { repositoryPath, reportPath } = req.body as {
    repositoryPath: string;
    reportPath: string;
  };

  if (!repositoryPath || !reportPath) {
    res
      .status(400)
      .json({ error: 'repositoryPath and reportPath are required' });
    return;
  }

  runTrivyScan({ repositoryPath, reportPath });
  res.status(200).json({ success: true });
});

export { app };
