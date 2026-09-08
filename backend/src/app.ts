import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { HttpError } from './errors/http-error';
import { errorHandler } from './middleware/error-handler';
import { authLimiter } from './middleware/rate-limit';
import { authRouter } from './modules/auth/auth.routes';
import { exerciseRouter } from './modules/exercise/exercise.routes';
import { measurementRouter } from './modules/measurement/measurement.routes';
import { progressRouter } from './modules/progress/progress.routes';
import { routineRouter } from './modules/routine/routine.routes';
import { routineTemplatesRouter } from './modules/routine-template/routine-template.routes';
import { routineShareRouter, socialRouter, workoutShareRouter } from './modules/social/social.routes';
import { usersRouter } from './modules/users/users.routes';
import { workoutRouter } from './modules/workout/workout.routes';
import { healthRouter } from './routes/health.routes';

export const app = express();

app.set('trust proxy', env.nodeEnv === 'production' ? 1 : false);
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
}));
app.use(cookieParser());
app.use(express.json());

// Defense-in-depth against CSRF for cookie-authenticated requests: reject
// state-changing requests that carry a disallowed Origin header.
app.use((request, _response, next) => {
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const origin = request.header('origin');
    if (origin && !env.corsOrigins.includes(origin)) {
      next(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed.'));
      return;
    }
  }

  next();
});

app.use(healthRouter);
app.use('/auth', authLimiter, authRouter);
app.use('/exercises', exerciseRouter);
app.use('/routines', routineRouter);
app.use('/routines', routineShareRouter);
app.use('/routine-templates', routineTemplatesRouter);
app.use('/workouts', workoutRouter);
app.use('/workouts', workoutShareRouter);
app.use('/social', socialRouter);
app.use('/users', usersRouter);
app.use('/progress', progressRouter);
app.use('/measurements', measurementRouter);

app.use((_request, _response, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', 'The requested route does not exist.'));
});

app.use(errorHandler);
