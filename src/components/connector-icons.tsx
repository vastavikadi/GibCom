export function SlackIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Slack logo"
    >
      <path
        d="M26.797 78.473a13.398 13.398 0 1 1-13.398-13.398h13.398v13.398z"
        fill="#E01E5A"
      />
      <path
        d="M33.496 78.473a13.398 13.398 0 0 1 26.797 0v33.496a13.398 13.398 0 1 1-26.797 0V78.473z"
        fill="#E01E5A"
      />
      <path
        d="M49.527 26.797a13.398 13.398 0 1 1 13.398-13.398v13.398H49.527z"
        fill="#36C5F0"
      />
      <path
        d="M49.527 33.496a13.398 13.398 0 0 1 0 26.797H16.031a13.398 13.398 0 1 1 0-26.797h33.496z"
        fill="#36C5F0"
      />
      <path
        d="M101.203 49.527a13.398 13.398 0 1 1 13.398 13.398h-13.398V49.527z"
        fill="#2EB67D"
      />
      <path
        d="M94.504 49.527a13.398 13.398 0 0 1-26.797 0V16.031a13.398 13.398 0 1 1 26.797 0v33.496z"
        fill="#2EB67D"
      />
      <path
        d="M78.473 101.203a13.398 13.398 0 1 1-13.398 13.398v-13.398h13.398z"
        fill="#ECB22E"
      />
      <path
        d="M78.473 94.504a13.398 13.398 0 0 1 0-26.797h33.496a13.398 13.398 0 1 1 0 26.797H78.473z"
        fill="#ECB22E"
      />
    </svg>
  );
}

export function GitHubIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 98 96"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="GitHub logo"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.36 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
        fill="currentColor"
      />
    </svg>
  );
}

export function JiraIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Jira logo"
    >
      <defs>
        <linearGradient id="jira-grad-a" x1="99.38%" y1="99.72%" x2="0.62%" y2="0.28%">
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient id="jira-grad-b" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path
        d="M62.66 30.65L33.35 1.34a1.9 1.9 0 0 0-2.69 0L19.29 12.71l15.34 15.34 16.68-1.34 11.35 3.94a1.9 1.9 0 0 0 0-2.69z"
        fill="url(#jira-grad-a)"
      />
      <path
        d="M32 30.69L19.29 17.98 1.34 35.93a1.9 1.9 0 0 0 0 2.69l15.34 15.34 15.32-15.32z"
        fill="#0052CC"
      />
      <path
        d="M33.35 32.04L46.06 19.33l-11.43-1.35-15.34 15.34 15.34 15.34 12.71-12.71-14-3.91z"
        fill="#2684FF"
      />
    </svg>
  );
}

export function ConfluenceIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Confluence logo"
    >
      <defs>
        <linearGradient id="confluence-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path
        d="M6.73 40.54C3.81 37.1 2 32.55 2 27.6c0-11.05 8.95-20 20-20 8.08 0 15.06 4.79 18.23 11.71-2.91-1.02-6.05-1.58-9.33-1.58-13.62 0-24.86 10.15-26.17 22.81z"
        fill="#0052CC"
      />
      <path
        d="M57.27 23.46C60.19 26.9 62 31.45 62 36.4c0 11.05-8.95 20-20 20-8.08 0-15.06-4.79-18.23-11.71 2.91 1.02 6.05 1.58 9.33 1.58 13.62 0 24.86-10.15 26.17-22.81z"
        fill="url(#confluence-grad)"
      />
    </svg>
  );
}

export function GoogleDriveIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 87.3 78"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Google Drive logo"
    >
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A8.9 8.9 0 0 0 0 53h27.5z" fill="#00ac47" />
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 13.8z" fill="#ea4335" />
      <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  );
}

