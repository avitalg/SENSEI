import {
  openRepoTasks,
  repoParseIssues,
  repoPatients,
  repoTasks,
} from '../src/data/mockPatientsRepo';

const patients = repoPatients();
const sessions = patients.flatMap((patient) => patient.sessions);
const files = patients.flatMap((patient) =>
  Object.keys(patient.sourceFiles).map((file) => `${patient.folder}/${file}`),
);
const tasks = repoTasks();
const issues = repoParseIssues();

console.log(JSON.stringify({
  patients: patients.length,
  sessions: sessions.length,
  files: files.length,
  tasks: tasks.length,
  openTasks: openRepoTasks().length,
  parseIssues: issues.length,
  patientFolders: patients.map((patient) => patient.folder),
  sessionRange: {
    minimum: Math.min(...patients.map((patient) => patient.sessions.length)),
    maximum: Math.max(...patients.map((patient) => patient.sessions.length)),
  },
}, null, 2));

if (issues.length) {
  console.error('\nParser issues:');
  for (const issue of issues) console.error(`- ${issue.patientId}: ${issue.issue}`);
  process.exitCode = 1;
}
