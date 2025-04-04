import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { GoogleGenAI } from "@google/genai";

const resolver = new Resolver();

resolver.define("getSummary", async (req) => {
  const issueIdOrKey = req.context.extension.issue.key; // Gets the issue/subtask ID

  try {
    const issues = await getIssues(issueIdOrKey);

    let commentList = await getAllComments(issues);

    if (commentList.length) {
      const GEMINI_API_KEY = "AIzaSyDW-LZmO2spyKQ_kAApXDfrYwxSIgZjuCU";
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      const prompt = `
    ${JSON.stringify(commentList)}

    from the give list generate a brief in the format 

    3 April 2025 ( which is todays date)
    - Authors Name : Maximum two sentence brief about what they are working on and what they have done in the last 24 hours ( by looking at timestamp and do not mention "last 24hrs", 
    the purpose of this is to give update, for others to know what the author is working on)

    format using proper spacing.
    `;

      async function main() {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-001",
          contents: prompt,
        });

        return response.text;
      }

      const msg = await main();

      return { comments: ["", msg.slice(3, -4)] };
    } else {
      return { comments: ["No recent comments"] };
    }
  } catch (error) {
    return { comments: ["Failed to fetch Comments", JSON.stringify(error)] };
  }
});

resolver.define("getComments", async (req) => {
  const issueIdOrKey = req.context.extension.issue.key; // Gets the issue/subtask ID

  try {
    const issues = await getIssues(issueIdOrKey);

    let commentList = await getAllComments(issues);

    if (commentList.length) {
      const GEMINI_API_KEY = "AIzaSyDW-LZmO2spyKQ_kAApXDfrYwxSIgZjuCU";

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      const prompt = `
    ${JSON.stringify(commentList)}

    Summarize all the comments to give updates on the progress of work.

    format using proper spacing.
    `;

      async function main() {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-001",
          contents: prompt,
        });

        return response.text;
      }

      const msg = await main();
      return { comments: ["", msg.slice(0, -1)] };
    } else {
      return { comments: ["No recent comments"] };
    }
  } catch (error) {
    return { comments: ["Failed to fetch Comments", JSON.stringify(error)] };
  }
});

export const handler = resolver.getDefinitions();

//Services

async function getIssues(issueIdOrKey) {
  const response = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueIdOrKey}`, {
      headers: {
        Accept: "application/json",
      },
    });

  const data = await response.json();

  const subtasks = data.fields.subtasks
    ? data.fields.subtasks.map((link) => link.key)
    : [];

  const linkedIssues =
    data.fields.issuelinks
      .filter((link) => link.outwardIssue)
      .map((link) => link.outwardIssue.key) || [];

  const issues = [issueIdOrKey, ...linkedIssues, ...subtasks];

  return issues;
}

async function getAllComments(issues) {
  let commentList = [];
  const now = new Date(); // Get current time
  const timeDelta = new Date(now.getTime() - 36 * 60 * 60 * 1000); // 24 hours ago

  for (let key of issues) {
    const commentResponse = await api
      .asUser()
      .requestJira(route`/rest/api/3/issue/${key}/comment`, {
        headers: {
          Accept: "application/json",
        },
      });

    const commentData = await commentResponse.json();

    const comments = commentData.comments
      .filter((comment) => {
        const commentDate = new Date(comment.created);
        return commentDate >= timeDelta; // Only keep comments from the last 24 hours
      })
      .map((comment) => ({
        author: comment.author?.displayName || "NA",
        comment:
          comment.body?.content
            ?.map((part) =>
              part.content?.map((textPart) => textPart.text).join(" ")
            )
            .join(" ") || "No comment",
        timestamp: comment.created || "",
      }));

    commentList.push(...comments);
  }

  return commentList;
}
