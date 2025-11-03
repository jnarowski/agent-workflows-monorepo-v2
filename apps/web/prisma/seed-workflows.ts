/**
 * Seed workflow data for testing and development.
 *
 * Usage:
 *   pnpm prisma:seed                    # Seed workflows for first available project
 *   pnpm prisma:seed <project-id>       # Seed workflows for specific project
 *
 * Examples:
 *   pnpm prisma:seed
 *   pnpm prisma:seed cmhj99cvg0000ya2nunnnglq9
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting workflow seeding...');

  // Parse command line arguments for optional project ID
  const targetProjectId = process.argv[2];

  // Clear existing workflow data
  console.log('Clearing existing workflow data...');
  await prisma.workflowArtifact.deleteMany({});
  await prisma.workflowComment.deleteMany({});
  await prisma.workflowExecutionStep.deleteMany({});
  await prisma.workflowExecution.deleteMany({});
  await prisma.workflowDefinition.deleteMany({});
  console.log('✅ Cleared existing workflow data');

  // Get existing projects and users for linking
  const projects = targetProjectId
    ? await prisma.project.findMany({ where: { id: targetProjectId } })
    : await prisma.project.findMany({ take: 3 });
  const users = await prisma.user.findMany({ take: 3 });

  if (projects.length === 0) {
    if (targetProjectId) {
      console.log(`❌ Project with ID "${targetProjectId}" not found.`);
    } else {
      console.log('❌ No projects found. Please seed projects first.');
    }
    return;
  }

  if (users.length === 0) {
    console.log('❌ No users found. Please seed users first.');
    return;
  }

  if (targetProjectId) {
    console.log(`🎯 Seeding workflows for project: ${projects[0].name} (${projects[0].id})`);
  } else {
    console.log(`Found ${projects.length} projects and ${users.length} users`);
  }

  // Use single project for all workflows when targeting specific project
  const projectId = projects[0].id;

  // Create Workflow Definitions (Templates)
  const featureWorkflow = await prisma.workflowDefinition.create({
    data: {
      project_id: projectId,
      name: 'Feature Implementation Workflow',
      description: 'Complete workflow for implementing a new feature from research to deployment',
      type: 'code',
      path: './.agent/workflows/templates/feature-implementation.yaml',
      phases: JSON.stringify([
        {
          name: 'Research',
          steps: ['Analyze requirements', 'Review similar implementations', 'Design architecture']
        },
        {
          name: 'Design',
          steps: ['Create technical spec', 'Design database schema', 'Plan API endpoints']
        },
        {
          name: 'Implementation',
          steps: ['Set up project structure', 'Implement core logic', 'Add tests', 'Code review']
        },
        {
          name: 'Testing',
          steps: ['Run unit tests', 'Run integration tests', 'Manual QA']
        },
        {
          name: 'Deployment',
          steps: ['Build application', 'Deploy to staging', 'Deploy to production']
        }
      ]),
      args_schema: JSON.stringify({
        type: 'object',
        properties: {
          featureName: { type: 'string', description: 'Name of the feature to implement' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
          targetDate: { type: 'string', format: 'date' }
        },
        required: ['featureName']
      }),
      is_template: true
    }
  });

  const bugFixWorkflow = await prisma.workflowDefinition.create({
    data: {
      project_id: projectId,
      name: 'Bug Fix Workflow',
      description: 'Streamlined workflow for investigating and fixing bugs',
      type: 'code',
      path: './.agent/workflows/templates/bug-fix.yaml',
      phases: JSON.stringify([
        {
          name: 'Investigation',
          steps: ['Reproduce bug', 'Analyze logs', 'Identify root cause']
        },
        {
          name: 'Fix',
          steps: ['Write fix', 'Add regression tests', 'Code review', 'Test fix']
        },
        {
          name: 'Verification',
          steps: ['Deploy to staging', 'Verify fix works']
        }
      ]),
      args_schema: JSON.stringify({
        type: 'object',
        properties: {
          bugId: { type: 'string', description: 'Bug tracking ID' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
          description: { type: 'string', description: 'Bug description' }
        },
        required: ['bugId', 'description']
      }),
      is_template: true
    }
  });

  const codeReviewWorkflow = await prisma.workflowDefinition.create({
    data: {
      project_id: projectId,
      name: 'Code Review Workflow',
      description: 'Comprehensive code review process with automated checks and feedback',
      type: 'code',
      path: './.agent/workflows/templates/code-review.yaml',
      phases: JSON.stringify([
        {
          name: 'Analysis',
          steps: ['Run linters', 'Run type checker', 'Check test coverage']
        },
        {
          name: 'Feedback',
          steps: ['Manual review', 'Security audit', 'Performance review']
        },
        {
          name: 'Revision',
          steps: ['Address feedback', 'Update tests', 'Re-run checks']
        },
        {
          name: 'Approval',
          steps: ['Final review', 'Approve PR']
        }
      ]),
      args_schema: JSON.stringify({
        type: 'object',
        properties: {
          prNumber: { type: 'number', description: 'Pull request number' },
          branch: { type: 'string', description: 'Branch name' },
          autoMerge: { type: 'boolean', default: false }
        },
        required: ['prNumber', 'branch']
      }),
      is_template: true
    }
  });

  console.log('Created 3 workflow definitions');

  // Create Workflow Executions with various statuses
  const executions = [];

  // Pending executions (2)
  executions.push(
    await prisma.workflowExecution.create({
      data: {
        name: 'Feature: User Profile Settings',
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'pending',
        current_phase: null,
        args: JSON.stringify({ featureName: 'User Profile Settings', priority: 'high' }),
        created_at: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      }
    }),
    await prisma.workflowExecution.create({
      data: {
        name: 'Review: PR #456 - Authentication Updates',
        workflow_definition_id: codeReviewWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'pending',
        current_phase: null,
        args: JSON.stringify({ prNumber: 456, branch: 'feature/auth-updates' }),
        created_at: new Date(Date.now() - 1000 * 60 * 30) // 30 min ago
      }
    })
  );

  // Running executions (3)
  executions.push(
    await prisma.workflowExecution.create({
      data: {
        name: 'Feature: Dark Mode Support',
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'running',
        current_phase: 'Implementation',
        args: JSON.stringify({ featureName: 'Dark Mode Support', priority: 'medium' }),
        started_at: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
      }
    }),
    await prisma.workflowExecution.create({
      data: {
        name: 'Bug Fix: Login Form Validation Error',
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'running',
        current_phase: 'Fix',
        args: JSON.stringify({ bugId: 'BUG-123', severity: 'high', description: 'Validation not triggering on empty password' }),
        started_at: new Date(Date.now() - 1000 * 60 * 20), // 20 min ago
        created_at: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      }
    }),
    await prisma.workflowExecution.create({
      data: {
        name: 'Review: PR #789 - Database Migration',
        workflow_definition_id: codeReviewWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'running',
        current_phase: 'Feedback',
        args: JSON.stringify({ prNumber: 789, branch: 'feature/db-migration' }),
        started_at: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
        created_at: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      }
    })
  );

  // Paused executions (2)
  executions.push(
    await prisma.workflowExecution.create({
      data: {
        name: 'Feature: Export to CSV',
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'paused',
        current_phase: 'Testing',
        args: JSON.stringify({ featureName: 'Export to CSV', priority: 'low' }),
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        paused_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4) // 4 hours ago
      }
    }),
    await prisma.workflowExecution.create({
      data: {
        name: 'Bug Fix: Memory Leak in Dashboard',
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'paused',
        current_phase: 'Investigation',
        args: JSON.stringify({ bugId: 'BUG-456', severity: 'critical', description: 'Dashboard consuming increasing memory over time' }),
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        paused_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6) // 6 hours ago
      }
    })
  );

  // Completed executions (3)
  executions.push(
    await prisma.workflowExecution.create({
      data: {
        name: 'Feature: Notification System',
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'completed',
        current_phase: 'Deployment',
        args: JSON.stringify({ featureName: 'Notification System', priority: 'high' }),
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) // 3 days ago
      }
    }),
    await prisma.workflowExecution.create({
      data: {
        name: 'Bug Fix: Incorrect Date Formatting',
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'completed',
        current_phase: 'Verification',
        args: JSON.stringify({ bugId: 'BUG-789', severity: 'low', description: 'Dates showing in wrong timezone' }),
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 30) // 30 hours ago
      }
    }),
    await prisma.workflowExecution.create({
      data: {
        name: 'Review: PR #234 - API Rate Limiting',
        workflow_definition_id: codeReviewWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'completed',
        current_phase: 'Approval',
        args: JSON.stringify({ prNumber: 234, branch: 'feature/rate-limiting', autoMerge: true }),
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 10), // 10 hours ago
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12) // 12 hours ago
      }
    })
  );

  // Failed executions (2)
  executions.push(
    await prisma.workflowExecution.create({
      data: {
        name: 'Feature: Advanced Search',
        workflow_definition_id: featureWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'failed',
        current_phase: 'Testing',
        args: JSON.stringify({ featureName: 'Advanced Search', priority: 'medium' }),
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
        error_message: 'Integration tests failed: 3 tests failed with timeout errors',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 10) // 10 hours ago
      }
    }),
    await prisma.workflowExecution.create({
      data: {
        name: 'Bug Fix: API Endpoint 500 Error',
        workflow_definition_id: bugFixWorkflow.id,
        project_id: projectId,
        user_id: users[0].id,
        status: 'failed',
        current_phase: 'Fix',
        args: JSON.stringify({ bugId: 'BUG-999', severity: 'critical', description: 'GET /api/users returns 500' }),
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        error_message: 'Code review failed: Security vulnerability detected in SQL query',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5) // 5 hours ago
      }
    })
  );

  console.log(`Created ${executions.length} workflow executions`);

  // Create Workflow Execution Steps
  const steps = [];
  let stepCount = 0;

  // Helper to create steps for an execution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createSteps = async (execution: any, definition: any, stepsToCreate: Array<{
    name: string;
    phase: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    order: number;
    logs?: string;
    error?: string;
  }>) => {
    for (const stepData of stepsToCreate) {
      const step = await prisma.workflowExecutionStep.create({
        data: {
          step_id: `step-${stepData.order}`,
          name: stepData.name,
          phase: stepData.phase,
          workflow_execution_id: execution.id,
          status: stepData.status,
          log_directory_path: stepData.logs || null,
          error_message: stepData.error || null,
          started_at: stepData.status !== 'pending' ? new Date(Date.now() - 1000 * 60 * (30 - stepData.order * 2)) : null,
          completed_at: stepData.status === 'completed' || stepData.status === 'failed' ? new Date(Date.now() - 1000 * 60 * (25 - stepData.order * 2)) : null
        }
      });
      steps.push(step);
      stepCount++;
    }
  };

  // Running execution: Dark Mode Support (in Implementation phase)
  await createSteps(executions[2], featureWorkflow, [
    { name: 'Analyze requirements', phase: 'Research', status: 'completed', order: 0, logs: '[2025-01-03 10:15:23] Starting requirements analysis\n[2025-01-03 10:16:45] Analyzed 15 user stories\n[2025-01-03 10:18:12] Requirements analysis complete' },
    { name: 'Review similar implementations', phase: 'Research', status: 'completed', order: 1, logs: '[2025-01-03 10:20:05] Searching for similar implementations\n[2025-01-03 10:22:30] Found 8 relevant examples\n[2025-01-03 10:25:00] Review complete' },
    { name: 'Design architecture', phase: 'Research', status: 'completed', order: 2, logs: '[2025-01-03 10:27:00] Starting architecture design\n[2025-01-03 10:30:15] Created component hierarchy\n[2025-01-03 10:32:45] Architecture design complete' },
    { name: 'Create technical spec', phase: 'Design', status: 'completed', order: 3, logs: '[2025-01-03 10:35:00] Writing technical specification\n[2025-01-03 10:40:20] Spec reviewed and approved\n[2025-01-03 10:42:00] Technical spec complete' },
    { name: 'Design database schema', phase: 'Design', status: 'completed', order: 4, logs: '[2025-01-03 10:45:00] Designing database schema\n[2025-01-03 10:48:30] Schema reviewed\n[2025-01-03 10:50:00] Database schema complete' },
    { name: 'Plan API endpoints', phase: 'Design', status: 'completed', order: 5, logs: '[2025-01-03 10:52:00] Planning API endpoints\n[2025-01-03 10:55:00] Endpoints documented\n[2025-01-03 10:57:00] API planning complete' },
    { name: 'Set up project structure', phase: 'Implementation', status: 'completed', order: 6, logs: '[2025-01-03 11:00:00] Creating project structure\n[2025-01-03 11:02:30] Files and folders created\n[2025-01-03 11:05:00] Project structure complete' },
    { name: 'Implement core logic', phase: 'Implementation', status: 'running', order: 7, logs: '[2025-01-03 11:07:00] Starting implementation\n[2025-01-03 11:15:30] Implemented theme context\n[2025-01-03 11:25:00] Building color palette...' },
    { name: 'Add tests', phase: 'Implementation', status: 'pending', order: 8 },
    { name: 'Code review', phase: 'Implementation', status: 'pending', order: 9 },
  ]);

  // Running execution: Bug Fix (in Fix phase)
  await createSteps(executions[3], bugFixWorkflow, [
    { name: 'Reproduce bug', phase: 'Investigation', status: 'completed', order: 0, logs: '[2025-01-03 11:40:00] Attempting to reproduce bug\n[2025-01-03 11:42:15] Bug reproduced successfully\n[2025-01-03 11:43:00] Reproduction complete' },
    { name: 'Analyze logs', phase: 'Investigation', status: 'completed', order: 1, logs: '[2025-01-03 11:45:00] Analyzing error logs\n[2025-01-03 11:47:30] Found validation error in form handler\n[2025-01-03 11:48:00] Log analysis complete' },
    { name: 'Identify root cause', phase: 'Investigation', status: 'completed', order: 2, logs: '[2025-01-03 11:50:00] Investigating root cause\n[2025-01-03 11:52:45] Root cause: Missing required field validation\n[2025-01-03 11:55:00] Root cause identified' },
    { name: 'Write fix', phase: 'Fix', status: 'completed', order: 3, logs: '[2025-01-03 11:57:00] Writing fix for validation\n[2025-01-03 12:00:30] Added password validation check\n[2025-01-03 12:02:00] Fix complete' },
    { name: 'Add regression tests', phase: 'Fix', status: 'running', order: 4, logs: '[2025-01-03 12:05:00] Writing regression tests\n[2025-01-03 12:08:15] Created test suite...' },
    { name: 'Code review', phase: 'Fix', status: 'pending', order: 5 },
    { name: 'Test fix', phase: 'Fix', status: 'pending', order: 6 },
  ]);

  // Running execution: Code Review (in Feedback phase)
  await createSteps(executions[4], codeReviewWorkflow, [
    { name: 'Run linters', phase: 'Analysis', status: 'completed', order: 0, logs: '[2025-01-03 12:45:00] Running ESLint\n[2025-01-03 12:46:30] No linting errors found\n[2025-01-03 12:47:00] Linting complete' },
    { name: 'Run type checker', phase: 'Analysis', status: 'completed', order: 1, logs: '[2025-01-03 12:48:00] Running TypeScript compiler\n[2025-01-03 12:50:15] Type checking passed\n[2025-01-03 12:51:00] Type checking complete' },
    { name: 'Check test coverage', phase: 'Analysis', status: 'completed', order: 2, logs: '[2025-01-03 12:52:00] Running test coverage\n[2025-01-03 12:55:30] Coverage: 87% (target: 80%)\n[2025-01-03 12:56:00] Coverage check complete' },
    { name: 'Manual review', phase: 'Feedback', status: 'running', order: 3, logs: '[2025-01-03 12:58:00] Starting manual code review\n[2025-01-03 13:05:15] Reviewing database migration files...' },
    { name: 'Security audit', phase: 'Feedback', status: 'pending', order: 4 },
    { name: 'Performance review', phase: 'Feedback', status: 'pending', order: 5 },
  ]);

  // Completed execution: Notification System
  await createSteps(executions[5], featureWorkflow, [
    { name: 'Analyze requirements', phase: 'Research', status: 'completed', order: 0, logs: '[2025-01-01 09:00:00] Requirements analysis started\n[2025-01-01 09:15:00] Analyzed notification requirements\n[2025-01-01 09:30:00] Analysis complete' },
    { name: 'Review similar implementations', phase: 'Research', status: 'completed', order: 1, logs: '[2025-01-01 09:35:00] Reviewing similar systems\n[2025-01-01 09:50:00] Review complete' },
    { name: 'Design architecture', phase: 'Research', status: 'completed', order: 2, logs: '[2025-01-01 10:00:00] Architecture design started\n[2025-01-01 10:30:00] Design complete' },
    { name: 'Create technical spec', phase: 'Design', status: 'completed', order: 3, logs: '[2025-01-01 10:45:00] Writing technical spec\n[2025-01-01 11:15:00] Spec complete' },
    { name: 'Design database schema', phase: 'Design', status: 'completed', order: 4, logs: '[2025-01-01 11:30:00] Database schema design\n[2025-01-01 12:00:00] Schema complete' },
    { name: 'Plan API endpoints', phase: 'Design', status: 'completed', order: 5, logs: '[2025-01-01 13:00:00] API endpoint planning\n[2025-01-01 13:30:00] Planning complete' },
    { name: 'Set up project structure', phase: 'Implementation', status: 'completed', order: 6, logs: '[2025-01-01 14:00:00] Project structure setup\n[2025-01-01 14:30:00] Structure complete' },
    { name: 'Implement core logic', phase: 'Implementation', status: 'completed', order: 7, logs: '[2025-01-01 15:00:00] Core logic implementation\n[2025-01-01 17:00:00] Implementation complete' },
    { name: 'Add tests', phase: 'Implementation', status: 'completed', order: 8, logs: '[2025-01-01 17:30:00] Writing tests\n[2025-01-01 18:30:00] Tests complete' },
    { name: 'Code review', phase: 'Implementation', status: 'completed', order: 9, logs: '[2025-01-02 09:00:00] Code review\n[2025-01-02 10:00:00] Review approved' },
    { name: 'Run unit tests', phase: 'Testing', status: 'completed', order: 10, logs: '[2025-01-02 10:30:00] Running unit tests\n[2025-01-02 10:45:00] All tests passed (45/45)' },
    { name: 'Run integration tests', phase: 'Testing', status: 'completed', order: 11, logs: '[2025-01-02 11:00:00] Running integration tests\n[2025-01-02 11:30:00] Integration tests passed (12/12)' },
    { name: 'Manual QA', phase: 'Testing', status: 'completed', order: 12, logs: '[2025-01-02 12:00:00] Manual QA testing\n[2025-01-02 13:00:00] QA approved' },
    { name: 'Build application', phase: 'Deployment', status: 'completed', order: 13, logs: '[2025-01-02 13:30:00] Building application\n[2025-01-02 14:00:00] Build successful' },
    { name: 'Deploy to staging', phase: 'Deployment', status: 'completed', order: 14, logs: '[2025-01-02 14:15:00] Deploying to staging\n[2025-01-02 14:45:00] Staging deployment complete' },
    { name: 'Deploy to production', phase: 'Deployment', status: 'completed', order: 15, logs: '[2025-01-02 15:00:00] Deploying to production\n[2025-01-02 15:30:00] Production deployment complete' }
  ]);

  // Failed execution: Advanced Search
  await createSteps(executions[8], featureWorkflow, [
    { name: 'Analyze requirements', phase: 'Research', status: 'completed', order: 0, logs: '[2025-01-02 19:00:00] Requirements analysis\n[2025-01-02 19:30:00] Analysis complete' },
    { name: 'Review similar implementations', phase: 'Research', status: 'completed', order: 1, logs: '[2025-01-02 19:45:00] Reviewing similar implementations\n[2025-01-02 20:00:00] Review complete' },
    { name: 'Design architecture', phase: 'Research', status: 'completed', order: 2, logs: '[2025-01-02 20:15:00] Architecture design\n[2025-01-02 20:45:00] Design complete' },
    { name: 'Create technical spec', phase: 'Design', status: 'completed', order: 3, logs: '[2025-01-02 21:00:00] Technical spec\n[2025-01-02 21:30:00] Spec complete' },
    { name: 'Design database schema', phase: 'Design', status: 'completed', order: 4, logs: '[2025-01-02 21:45:00] Database schema\n[2025-01-02 22:00:00] Schema complete' },
    { name: 'Plan API endpoints', phase: 'Design', status: 'completed', order: 5, logs: '[2025-01-02 22:15:00] API planning\n[2025-01-02 22:30:00] Planning complete' },
    { name: 'Set up project structure', phase: 'Implementation', status: 'completed', order: 6, logs: '[2025-01-03 08:00:00] Project setup\n[2025-01-03 08:30:00] Setup complete' },
    { name: 'Implement core logic', phase: 'Implementation', status: 'completed', order: 7, logs: '[2025-01-03 09:00:00] Core implementation\n[2025-01-03 11:00:00] Implementation complete' },
    { name: 'Add tests', phase: 'Implementation', status: 'completed', order: 8, logs: '[2025-01-03 11:30:00] Writing tests\n[2025-01-03 12:00:00] Tests complete' },
    { name: 'Code review', phase: 'Implementation', status: 'completed', order: 9, logs: '[2025-01-03 12:30:00] Code review\n[2025-01-03 13:00:00] Review approved' },
    { name: 'Run unit tests', phase: 'Testing', status: 'completed', order: 10, logs: '[2025-01-03 13:30:00] Running unit tests\n[2025-01-03 13:45:00] All unit tests passed' },
    { name: 'Run integration tests', phase: 'Testing', status: 'failed', order: 11, logs: '[2025-01-03 14:00:00] Running integration tests\n[2025-01-03 14:15:00] ERROR: 3 tests timed out\n[2025-01-03 14:16:00] Test failures detected', error_message: 'Integration tests failed: 3 tests failed with timeout errors' },
  ]);

  console.log(`Created ${stepCount} workflow execution steps`);

  // Create Comments
  const comments = [];

  // Comments for running workflows
  comments.push(
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[2].id,
        created_by: users[0].id,
        text: 'Starting implementation of dark mode theme system',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 40)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[2].id,
        created_by: users[0].id,
        text: 'Research phase completed successfully. Moving to Design phase.',
        comment_type: 'system',
        created_at: new Date(Date.now() - 1000 * 60 * 35)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[2].id,
        created_by: users[0].id,
        text: 'Design phase completed. Technical spec approved. Starting implementation.',
        comment_type: 'system',
        created_at: new Date(Date.now() - 1000 * 60 * 30)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[3].id,
        created_by: users[0].id,
        text: 'Found the issue - missing required field validation on password input',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 18)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[3].id,
        created_by: users[0].id,
        text: 'Investigation phase completed. Root cause identified: Missing required field validation.',
        comment_type: 'system',
        created_at: new Date(Date.now() - 1000 * 60 * 15)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[3].id,
        created_by: users[0].id,
        text: 'Fix applied successfully. Added password validation check to form handler.',
        comment_type: 'agent',
        created_at: new Date(Date.now() - 1000 * 60 * 10)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[4].id,
        created_by: users[0].id,
        text: 'Migration files look good. Need to verify index performance on large tables.',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 12)
      }
    })
  );

  // Comments for completed workflows
  comments.push(
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[5].id,
        created_by: users[0].id,
        text: 'Great work on this feature! The notification system works perfectly.',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[5].id,
        created_by: users[0].id,
        text: 'All phases completed successfully. Workflow finished.',
        comment_type: 'system',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[5].id,
        created_by: users[0].id,
        text: 'Tests passed: 45 unit tests, 12 integration tests. Code coverage: 92%.',
        comment_type: 'agent',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 26)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[6].id,
        created_by: users[0].id,
        text: 'Bug fixed and verified in staging. Ready for production.',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[6].id,
        created_by: users[0].id,
        text: 'Fix verified successfully. No regressions detected.',
        comment_type: 'agent',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 13)
      }
    })
  );

  // Comments for failed workflows
  comments.push(
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[8].id,
        created_by: users[0].id,
        text: 'Integration tests are timing out. Need to investigate query performance.',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[8].id,
        created_by: users[0].id,
        text: 'Workflow failed during Testing phase. Error: Integration tests failed with timeout errors.',
        comment_type: 'system',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[9].id,
        created_by: users[0].id,
        text: 'Security review flagged SQL injection vulnerability. Need to use parameterized queries.',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 3)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[9].id,
        created_by: users[0].id,
        text: 'Workflow failed during Fix phase. Error: Security vulnerability detected in SQL query.',
        comment_type: 'system',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 3)
      }
    })
  );

  // Comments for paused workflows
  comments.push(
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[6].id,
        created_by: users[0].id,
        text: 'Pausing to wait for QA team availability. Will resume tomorrow.',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 60)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[6].id,
        created_by: users[0].id,
        text: 'Workflow paused by user.',
        comment_type: 'system',
        created_at: new Date(Date.now() - 1000 * 60 * 60)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[7].id,
        created_by: users[0].id,
        text: 'Need more time to analyze memory profiling data. Pausing for now.',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2)
      }
    }),
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[7].id,
        created_by: users[0].id,
        text: 'Workflow paused by user.',
        comment_type: 'system',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2)
      }
    })
  );

  console.log(`Created ${comments.length} workflow comments`);

  // Create Artifacts
  const artifacts = [];

  // Get some steps to attach artifacts to
  const stepsWithArtifacts = [steps[10], steps[11], steps[15], steps[20], steps[25]];

  artifacts.push(
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: stepsWithArtifacts[3]?.id || steps[10]?.id,
        name: 'test-results.json',
        file_type: 'document',
        file_path: '/artifacts/test-results-notification-system.json',
        mime_type: 'application/json',
        size_bytes: 15420,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 26)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: stepsWithArtifacts[3]?.id || steps[10]?.id,
        name: 'coverage-report.html',
        file_type: 'document',
        file_path: '/artifacts/coverage-report-notification-system.html',
        mime_type: 'text/html',
        size_bytes: 328540,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 26)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: stepsWithArtifacts[4]?.id || steps[11]?.id,
        name: 'deployment-logs.txt',
        file_type: 'document',
        file_path: '/artifacts/deployment-logs-notification-system.txt',
        mime_type: 'text/plain',
        size_bytes: 45680,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: steps[2]?.id,
        name: 'bug-fix-verification.png',
        file_type: 'image',
        file_path: '/artifacts/bug-fix-verification-screenshot.png',
        mime_type: 'image/png',
        size_bytes: 125400,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: stepsWithArtifacts[1]?.id || steps[1]?.id,
        name: 'integration-test-failures.log',
        file_type: 'document',
        file_path: '/artifacts/integration-test-failures.log',
        mime_type: 'text/plain',
        size_bytes: 28940,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: steps[1]?.id,
        name: 'memory-profile.json',
        file_type: 'document',
        file_path: '/artifacts/memory-profile-dashboard.json',
        mime_type: 'application/json',
        size_bytes: 87230,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: steps[5]?.id,
        name: 'dark-mode-design-mockup.png',
        file_type: 'image',
        file_path: '/artifacts/dark-mode-mockup.png',
        mime_type: 'image/png',
        size_bytes: 245800,
        created_at: new Date(Date.now() - 1000 * 60 * 35)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: steps[6]?.id,
        name: 'color-palette.json',
        file_type: 'code',
        file_path: '/artifacts/dark-mode-color-palette.json',
        mime_type: 'application/json',
        size_bytes: 3420,
        created_at: new Date(Date.now() - 1000 * 60 * 30)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: steps[3]?.id,
        name: 'migration-schema.sql',
        file_type: 'code',
        file_path: '/artifacts/migration-schema-pr789.sql',
        mime_type: 'text/plain',
        size_bytes: 8920,
        created_at: new Date(Date.now() - 1000 * 60 * 12)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: steps[4]?.id,
        name: 'performance-analysis.md',
        file_type: 'document',
        file_path: '/artifacts/performance-analysis-pr789.md',
        mime_type: 'text/markdown',
        size_bytes: 12540,
        created_at: new Date(Date.now() - 1000 * 60 * 10)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: steps[4]?.id,
        name: 'validation-tests.spec.ts',
        file_type: 'code',
        file_path: '/artifacts/validation-tests-bug123.spec.ts',
        mime_type: 'text/plain',
        size_bytes: 5680,
        created_at: new Date(Date.now() - 1000 * 60 * 8)
      }
    }),
    await prisma.workflowArtifact.create({
      data: {
        workflow_execution_step_id: steps[1]?.id,
        name: 'heap-snapshot.heapsnapshot',
        file_type: 'other',
        file_path: '/artifacts/heap-snapshot-dashboard.heapsnapshot',
        mime_type: 'application/octet-stream',
        size_bytes: 1543200,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2)
      }
    })
  );

  console.log(`Created ${artifacts.length} workflow artifacts`);

  // Create Agent Sessions linked to real Claude sessions
  const agentSessions = [];
  const claudeSessionsDir = '/Users/jnarowski/.claude/projects/-Users-jnarowski-Dev-sourceborn-src-agent-workflows-monorepo-v2';

  // Use real Claude session IDs from existing sessions
  const realSessionIds = [
    '03ab3659-6e23-4706-a769-ff775961e2dd',
    '0455831e-78f2-4526-9edd-94f2ab3dcd3e',
    '0614cd0a-93a7-43de-968d-e33e8c24b149',
    '026256b8-ae83-4356-a593-91782854a119',
    '02e697ce-e279-4c32-917c-5dc3ee5ef966'
  ];

  // Create agent sessions for some of the workflow steps
  // Dark Mode workflow - Implementation step
  const darkModeSession = await prisma.agentSession.create({
    data: {
      projectId: projectId,
      userId: users[0].id,
      name: 'Dark Mode Implementation',
      agent: 'claude',
      cli_session_id: realSessionIds[0],
      session_path: `${claudeSessionsDir}/${realSessionIds[0]}.jsonl`,
      metadata: {
        totalTokens: 15432,
        messageCount: 24,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        firstMessagePreview: 'Implement dark mode theme system for the application'
      },
      state: 'idle',
      created_at: new Date(Date.now() - 1000 * 60 * 45),
      updated_at: new Date(Date.now() - 1000 * 60 * 25)
    }
  });
  agentSessions.push(darkModeSession);

  // Bug Fix workflow - Fix step
  const bugFixSession = await prisma.agentSession.create({
    data: {
      projectId: projectId,
      userId: users[0].id,
      name: 'Login Form Validation Fix',
      agent: 'claude',
      cli_session_id: realSessionIds[1],
      session_path: `${claudeSessionsDir}/${realSessionIds[1]}.jsonl`,
      metadata: {
        totalTokens: 8234,
        messageCount: 15,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        firstMessagePreview: 'Fix password validation in login form'
      },
      state: 'idle',
      created_at: new Date(Date.now() - 1000 * 60 * 20),
      updated_at: new Date(Date.now() - 1000 * 60 * 8)
    }
  });
  agentSessions.push(bugFixSession);

  // Code Review workflow - Analysis step
  const codeReviewSession = await prisma.agentSession.create({
    data: {
      projectId: projectId,
      userId: users[0].id,
      name: 'Database Migration Review',
      agent: 'claude',
      cli_session_id: realSessionIds[2],
      session_path: `${claudeSessionsDir}/${realSessionIds[2]}.jsonl`,
      metadata: {
        totalTokens: 12876,
        messageCount: 18,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        firstMessagePreview: 'Review database migration schema and performance'
      },
      state: 'working',
      created_at: new Date(Date.now() - 1000 * 60 * 15),
      updated_at: new Date(Date.now() - 1000 * 60 * 5)
    }
  });
  agentSessions.push(codeReviewSession);

  // Completed workflow - Notification System
  const notificationSession = await prisma.agentSession.create({
    data: {
      projectId: projectId,
      userId: users[0].id,
      name: 'Notification System Implementation',
      agent: 'claude',
      cli_session_id: realSessionIds[3],
      session_path: `${claudeSessionsDir}/${realSessionIds[3]}.jsonl`,
      metadata: {
        totalTokens: 45789,
        messageCount: 67,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        firstMessagePreview: 'Build a complete notification system with real-time updates'
      },
      state: 'idle',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24)
    }
  });
  agentSessions.push(notificationSession);

  // Failed workflow - Advanced Search
  const searchSession = await prisma.agentSession.create({
    data: {
      projectId: projectId,
      userId: users[0].id,
      name: 'Advanced Search Feature',
      agent: 'claude',
      cli_session_id: realSessionIds[4],
      session_path: `${claudeSessionsDir}/${realSessionIds[4]}.jsonl`,
      metadata: {
        totalTokens: 28432,
        messageCount: 42,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        firstMessagePreview: 'Implement advanced search with filters and sorting'
      },
      state: 'error',
      error_message: 'Integration tests failed with timeout errors',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 10),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 8)
    }
  });
  agentSessions.push(searchSession);

  console.log(`Created ${agentSessions.length} agent sessions`);

  // Link agent sessions to workflow steps
  // Dark Mode - Implementation step (running)
  await prisma.workflowExecutionStep.update({
    where: { id: steps[7].id },
    data: { agent_session_id: darkModeSession.id }
  });

  // Bug Fix - Fix step (running)
  await prisma.workflowExecutionStep.update({
    where: { id: steps[14].id },
    data: { agent_session_id: bugFixSession.id }
  });

  // Code Review - Manual review step (running)
  await prisma.workflowExecutionStep.update({
    where: { id: steps[20].id },
    data: { agent_session_id: codeReviewSession.id }
  });

  // Notification System - Implementation step (completed)
  await prisma.workflowExecutionStep.update({
    where: { id: steps[31].id },
    data: { agent_session_id: notificationSession.id }
  });

  // Advanced Search - Implementation step (failed)
  await prisma.workflowExecutionStep.update({
    where: { id: steps[44].id },
    data: { agent_session_id: searchSession.id }
  });

  console.log(`Linked agent sessions to workflow steps`);

  // Create Comments with Attachments
  const commentsWithAttachments = [];

  // Example 1: User comment with screenshot attachment
  commentsWithAttachments.push(
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[2].id,
        workflow_execution_step_id: steps[5]?.id, // Dark mode design step
        created_by: users[0].id,
        text: 'Dark mode design mockup completed. Attached the final design for review.',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 34),
        artifacts: {
          connect: {
            id: artifacts[6].id // dark-mode-design-mockup.png
          }
        }
      }
    })
  );

  // Example 2: Agent comment with test results
  commentsWithAttachments.push(
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[5].id,
        workflow_execution_step_id: stepsWithArtifacts[3]?.id,
        created_by: users[0].id,
        text: 'Test suite executed successfully. All 45 unit tests and 12 integration tests passed. See attached test results and coverage report.',
        comment_type: 'agent',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 26),
        artifacts: {
          connect: [
            { id: artifacts[0].id }, // test-results.json
            { id: artifacts[1].id }  // coverage-report.html
          ]
        }
      }
    })
  );

  // Example 3: System comment with deployment logs
  commentsWithAttachments.push(
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[5].id,
        workflow_execution_step_id: stepsWithArtifacts[4]?.id,
        created_by: users[0].id,
        text: 'Deployment to staging environment completed. Detailed deployment logs attached for verification.',
        comment_type: 'system',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
        artifacts: {
          connect: {
            id: artifacts[2].id // deployment-logs.txt
          }
        }
      }
    })
  );

  // Example 4: User comment with verification screenshot
  commentsWithAttachments.push(
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[3].id,
        workflow_execution_step_id: steps[2]?.id,
        created_by: users[0].id,
        text: 'Bug fix verified on staging. Password validation now working correctly - see attached verification screenshot.',
        comment_type: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12),
        artifacts: {
          connect: {
            id: artifacts[3].id // bug-fix-verification.png
          }
        }
      }
    })
  );

  // Example 5: Agent comment with multiple attachments (code + analysis)
  commentsWithAttachments.push(
    await prisma.workflowComment.create({
      data: {
        workflow_execution_id: executions[4].id,
        workflow_execution_step_id: steps[3]?.id,
        created_by: users[0].id,
        text: 'Database migration schema created and performance analysis completed. Both files attached for review before applying to production.',
        comment_type: 'agent',
        created_at: new Date(Date.now() - 1000 * 60 * 11),
        artifacts: {
          connect: [
            { id: artifacts[8].id },  // migration-schema.sql
            { id: artifacts[9].id }   // performance-analysis.md
          ]
        }
      }
    })
  );

  console.log(`Created ${commentsWithAttachments.length} comments with attachments`);

  console.log('\nWorkflow seeding complete!');
  console.log(`Summary:`);
  console.log(`  - 3 workflow definitions`);
  console.log(`  - ${executions.length} workflow executions`);
  console.log(`  - ${stepCount} workflow execution steps`);
  console.log(`  - ${agentSessions.length} agent sessions (linked to real Claude sessions)`);
  console.log(`  - ${comments.length} comments`);
  console.log(`  - ${artifacts.length} artifacts`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
