import express from 'express';

import { HttpError } from './errors/http-error';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { exerciseRouter } from './modules/exercise/exercise.routes';
import { progressRouter } from './modules/progress/progress.routes';
import { routineRouter } from './modules/routine/routine.routes';
import { workoutRouter } from './modules/workout/workout.routes';
import { healthRouter } from './routes/health.routes';

export const app = express();

app.use(express.json());
app.use(healthRouter);
app.use('/auth', authRouter);
app.use('/exercises', exerciseRouter);
app.use('/routines', routineRouter);
app.use('/workouts', workoutRouter);
app.use('/progress', progressRouter);

app.use((_request, _response, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', 'The requested route does not exist.'));
});

app.use(errorHandler);
