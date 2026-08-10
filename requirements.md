## 4.4 Workout Tracking

Workout tracking is one of the core features of ASCEND. Users must be able to start a workout based on an existing routine or create a workout independently. During an active workout, users must be able to record their performance in real time.

### Set Data

Each completed set may contain:

- Weight
- Repetitions
- RPE
- Set type
- Notes
- Completion status

### Set Types

ASCEND should support the following set types:

- Normal
- Warm-up
- Drop set
- Failure

### Previous Performance

When performing an exercise, ASCEND should display relevant information from the user's previous performance. For example:

```text
Previous workout:

Bench Press
60 kg × 10
60 kg × 9
65 kg × 7
```

This information should help users make informed decisions about their current workout.

### Workout Controls

Users must be able to:

- Start a workout.
- Pause a workout.
- Resume a workout.
- Complete a workout.
- Cancel a workout.
- Add exercises during a workout.
- Remove exercises during a workout.
- Edit recorded sets.

## 4.5 Rest Timer

ASCEND should provide an integrated rest timer. When a user completes a set, the application should be able to automatically start a countdown based on the configured rest period.

Users should be able to:

- Start the timer automatically.
- Start the timer manually.
- Pause the timer.
- Skip the timer.
- Adjust the duration.

The timer should remain accessible while navigating through the active workout.

## 4.6 Supersets

ASCEND should support grouping multiple exercises into supersets. A superset may contain two or more exercises.

Example:

```text
Superset A

Exercise 1: Bicep Curl
Exercise 2: Triceps Extension
```

Users should be able to:

- Create a superset.
- Add exercises to a superset.
- Remove exercises from a superset.
- Perform the exercises sequentially.
- Track sets independently for each exercise.

This feature may be implemented after the initial MVP.

## 4.7 Workout History

Users must be able to view their previous workouts. Each workout should contain information such as:

- Date
- Duration
- Routine
- Exercises performed
- Sets completed
- Total repetitions
- Total volume

Users should be able to open a previous workout and inspect its details.

## 4.8 Progress Tracking

ASCEND must provide tools for users to analyze their training progression.

### Exercise Progress

Users should be able to view their progression for individual exercises, including:

- Weight progression
- Repetition progression
- Volume progression
- Estimated strength progression

### Statistics

ASCEND should provide statistics such as:

- Total workouts
- Workout frequency
- Total volume
- Total sets
- Total repetitions
- Personal records
- Exercise progression

### Charts

The application should provide visual representations of training data, including:

- Weight over time
- Volume over time
- Repetitions over time
- Workout frequency
- Weekly volume

## 4.9 Personal Records

ASCEND should identify personal records achieved by users, including:

- Highest weight lifted
- Highest repetitions at a given weight
- Estimated one-repetition maximum
- Highest training volume

The application should maintain a history of relevant personal records.

## 4.10 Estimated One-Rep Max

ASCEND may calculate an estimated one-repetition maximum based on recorded sets. The calculation should be performed from workout data rather than requiring the user to perform an actual one-repetition maximum test. The exact calculation method will be defined during implementation.

## 4.11 Muscle Group Tracking

ASCEND should be able to associate exercises with one or more muscle groups. This information can later be used to provide:

- Muscle group statistics
- Training frequency by muscle group
- Muscle group volume
- Muscle balance visualizations

A visual muscle heatmap may be implemented in a future version.

## 4.12 Plate Calculator

ASCEND should provide a plate calculator for barbell exercises. Users should be able to enter:

- Target weight
- Barbell weight
- Available plates

The application should calculate the plates required on each side of the bar.

Example:

```text
Target: 100 kg
Bar: 20 kg

Each side:
20 kg
10 kg
5 kg
2.5 kg
```

This feature may be implemented after the core workout tracking system.

## 4.13 Routine Templates

ASCEND may provide predefined workout routines that users can add to their accounts. Examples include:

- Push / Pull / Legs
- Upper / Lower
- Full Body
- Beginner routines

Templates may be categorized by:

- Experience level
- Training goal
- Available equipment

This feature is not required for the initial MVP.

## 4.14 Social Features

ASCEND may eventually include social functionality. Potential features include:

- User profiles
- Following users
- Followers
- Workout feed
- Likes
- Comments
- Sharing workouts
- Sharing routines
- Copying another user's routine

Example:

```text
User A
  ↓
Publishes workout
  ↓
Social Feed
  ↓
User B
  ├── Like
  ├── Comment
  └── Copy Routine
```

Social functionality is outside the scope of the initial MVP.

# 5. Non-Functional Requirements

## 5.1 Performance

The application should:

- Respond quickly to user interactions.
- Avoid unnecessary API requests.
- Load workout data efficiently.
- Remain responsive during active workouts.
- Support efficient synchronization with the backend.

## 5.2 Security

The application must:

- Secure user authentication.
- Hash passwords before storing them.
- Protect authenticated API endpoints.
- Validate incoming data.
- Prevent unauthorized access to user data.
- Never expose sensitive credentials in the mobile application.
- Store secrets using environment variables.

## 5.3 Usability

The application should prioritize fast interaction during workouts. The user should be able to record a set with minimal interaction.

The active workout interface should prioritize:

- Exercise name
- Previous performance
- Weight
- Repetitions
- Set completion
- Rest timer

## 5.4 Reliability

Workout data should not be easily lost due to:

- Temporary network failures
- Application interruptions
- Accidental navigation

The architecture should allow future implementation of local persistence and synchronization.

## 5.5 Scalability

The backend should be structured so that future functionality can be added without requiring a complete rewrite. Potential future additions include:

- Social features
- More advanced analytics
- Additional exercise metadata
- Notifications
- Cloud synchronization
- Multiple devices

# 6. MVP Scope

The first version of ASCEND should focus on the essential workout tracking experience.

## MVP Features

### Authentication

- User registration
- User login
- User logout

### Exercises

- Exercise library
- Exercise search
- Exercise filtering
- Exercise details
- Custom exercises

### Routines

- Create routines
- Edit routines
- Delete routines
- Add exercises
- Remove exercises
- Reorder exercises
- Configure target sets and repetitions

### Workouts

- Start workout
- Record exercises
- Record sets
- Record weight
- Record repetitions
- Record RPE
- Record set type
- Complete workout
- View previous performance

### History

- View previous workouts
- View workout details

### Progress

- Exercise progression
- Training volume
- Workout frequency
- Personal records
- Basic progress charts

### Rest Timer

- Configurable rest time
- Automatic timer after completed sets
- Manual timer controls

# 7. Post-MVP Features

The following features should be considered after the MVP:

## Version 2

- Supersets
- Plate calculator
- Advanced statistics
- Estimated 1RM
- Muscle group statistics
- Muscle heatmap
- Routine templates
- Advanced workout analytics

## Version 3

- User profiles
- Following and followers
- Social feed
- Likes
- Comments
- Shared workouts
- Shared routines
- Copying routines from other users

# 8. Future Considerations

The architecture should leave room for future functionality without requiring major structural changes. Potential future features include:

- Push notifications
- Workout reminders
- Rest timer notifications
- Offline workout tracking
- Cloud synchronization
- Multiple devices
- Apple Health integration
- Google Health Connect integration
- Wearable device integration
- Advanced analytics
- Social challenges

These features are not part of the current scope.

# 9. Product Principles

ASCEND should follow these principles throughout development:

## Simplicity

Recording a set should require as few interactions as possible.

## Progression

The application should help users understand whether they are progressing over time.

## Data

Workout data should be structured so it can be used for meaningful statistics and visualizations.

## Flexibility

Users should be able to create routines that fit their own training style.

## Scalability

The application should be designed so that new features can be added without compromising the existing system.

## User Ownership

Users should have control over their routines, workouts, exercises, and personal training data.
