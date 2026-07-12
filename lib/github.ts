const GITHUB_LOGIN = "rdgonzaga";
const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

const CONTRIBUTIONS_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

const LEVEL_MAP: Record<string, 0 | 1 | 2 | 3 | 4> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export type GithubActivityDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type GithubActivityWeek = {
  days: GithubActivityDay[];
};

export type GithubActivity = {
  totalContributions: number;
  weeks: GithubActivityWeek[];
};

type GraphQLContributionDay = {
  date: string;
  contributionCount: number;
  contributionLevel: string;
};

type GraphQLResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: { contributionDays: GraphQLContributionDay[] }[];
        };
      };
    };
  };
};

export async function getGithubActivity(): Promise<GithubActivity | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: { login: GITHUB_LOGIN },
      }),
      next: { revalidate: 21600 },
    });

    if (!response.ok) return null;

    const json = (await response.json()) as GraphQLResponse;
    const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) return null;

    const weeks: GithubActivityWeek[] = calendar.weeks.map((week) => ({
      days: week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
        level: LEVEL_MAP[day.contributionLevel] ?? 0,
      })),
    }));

    return {
      totalContributions: calendar.totalContributions,
      weeks,
    };
  } catch {
    return null;
  }
}
