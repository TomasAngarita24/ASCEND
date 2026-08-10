import { app } from './app';

const DEFAULT_PORT = 3000;
const port = Number(process.env.PORT) || DEFAULT_PORT;

app.listen(port, () => {
  console.log(`ASCEND backend scaffold listening on port ${port}`);
});
