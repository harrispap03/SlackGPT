const getGPTTicket = async (conversation, openai) => {
  const basePrompt =
    'The following is a discussion between 2 people at a company. Create a Jira ticket with a "Title" and a "Description" section relative to what they are talking about:\n';
  try {
    const fullPrompt = basePrompt + conversation;

    const completionResponse = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: fullPrompt,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const completionText = completionResponse.data.choices[0].text;

    const titleRegex = /Title: (.*)\n/;
    const descriptionRegex = /Description: (.*)/;

    const title = completionText.match(titleRegex)[1];
    const description = completionText.match(descriptionRegex)[1];
    return { title, description };
  } catch (error) {
    // or error.response for gpt api failures
    console.log("ERRROR", error);
  }
};

const getThreadSummary = async (conversation, openai) => {
  const basePrompt =
    'Summarize the following discussion: \n';
  try {
    const fullPrompt = basePrompt + conversation;

    const completionResponse = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: fullPrompt,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const completionText = completionResponse.data.choices[0].text;
    return completionText
  } catch (error) {
    // or error.response for gpt api failures
    console.log("ERRROR", error);
  }
};

const getMessagesFromThread = async (app, event, context) => {
  const messagesInThreadResponse = await app.client.conversations.replies({
    token: context.botToken,
    channel: event.channel,
    ts: event.thread_ts,
  });

  const strippedMessages = messagesInThreadResponse.messages.map(
    (message) => `${message.user}:${message.text}/n `
  );

  const messageString = strippedMessages.join("");
  return messageString;
};

const getProjectLabels = async () => {
  try {
    const res = await authFetch(
      `${process.env.JIRA_PROJECT_URL}/rest/api/3/label`,
      "GET"
    );

    // for some reason it only gives me the labels that I've used in a ticket
    const responseLabel = await res.json();
    return responseLabel.values;
  } catch (e) {
    console.log("couldnt get project labels", e);
  }
};

const getProjectIssueTypes = async () => {
  const projectId = process.env.JIRA_PROJECT_ID;
  try {
    const res = await authFetch(
      `${process.env.JIRA_PROJECT_URL}/rest/api/3/issue/createmeta?projectIds=${projectId}`,
      "GET"
    );

    const projectsObj = await res.json();

    const issueTypes = projectsObj.projects[0].issuetypes;
    const issueTypeIds = issueTypes.map((issueTypeObject) => {
      return issueTypeObject.name;
    });
    return issueTypeIds;
  } catch (e) {
    console.log("Couldn't get issue types", e);
  }
};

const authFetch = async (url, options) => {
  const email = process.env.JIRA_ACCOUNT_EMAIL;
  const token = process.env.JIRA_ACCOUNT_BOT_TOKEN;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(email + ":" + token).toString(
      "base64"
    )}`,
  };
  options = {
    ...options,
    headers: {
      ...options?.headers,
      ...headers,
    },
  };
  return await fetch(url, options);
};

const getJiraTicketBody = (title, description, label, issueType) => {
  const projectIssueTypes = getProjectIssueTypes();
  const projectId = process.env.JIRA_PROJECT_ID;
  return {
    fields: {
      project: { id: projectId },
      issuetype: { name: issueType },
      summary: title,
      description: description,
      labels: [label],
    },
  };
};

const postTicket = async (ticketTitle, ticketDescription, label, issueType) => {
  const body = getJiraTicketBody(
    ticketTitle,
    ticketDescription,
    label,
    issueType
  );
  try {
    const response = await authFetch(`${JIRA_PROJECT_URL}/rest/api/2/issue`, {
      body: JSON.stringify(body),
      method: "POST",
    });

    const res = await response.json();
    console.log(res.errors);
  } catch (e) {
    console.log("couldn't post jira ticket", e);
  }
};

const constructLabelOptionArray = (labels) => {
  return labels.map((label) => ({
    text: { type: "plain_text", text: label },
    value: label,
  }));
};

const constructIssueTypeIdsArray = (issueTypeIds) => {
  return issueTypeIds.map((issueTypeId) => ({
    text: { type: "plain_text", text: issueTypeId },
    value: issueTypeId,
  }));
};

module.exports = {
  getGPTTicket,
  getMessagesFromThread,
  getProjectLabels,
  getProjectIssueTypes,
  postTicket,
  constructLabelOptionArray,
  constructIssueTypeIdsArray,
  getThreadSummary,
};
