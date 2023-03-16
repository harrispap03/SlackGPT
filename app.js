// import { Configuration, OpenAIApi } from "openai";
const { Configuration, OpenAIApi } = require("openai");
const {
  getMessagesFromThread,
  getGPTSummary,
  getProjectIssueTypes,
  getProjectLabels,
  postTicket,
  constructLabelOptionArray,
  constructIssueTypeIdsArray,
} = require("./utils");
require("dotenv").config();

const { App, LogLevel } = require("@slack/bolt");
var provisionalTicket = {
  labelsArray: null,
  issueTypesArray: null,
};

// Initialize slack stuff
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  // Socket Mode doesn't listen on a port, but in case you want your app to respond to OAuth,
  // you still need to listen on some port!
  port: process.env.PORT || 3000,
  logLevel: LogLevel.INFO,
});

// Initialize openAI stuff
const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

// Listen for messages and if a message mentions you respond with the modal button
app.event("message", async ({ event, context }) => {
  if (!event.thread_ts || !event.text.includes(`<@${context.botUserId}>`))
    return;
  const slackMessagesString = await getMessagesFromThread(app, event, context);

  provisionalTicket = await getGPTSummary(slackMessagesString, openai);

  await app.client.chat.postMessage({
    token: context.botToken,
    channel: event.channel,
    thread_ts: event.thread_ts,
    text: "GPT response",
    blocks: [
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Open Modal",
            },
            value: "open_modal",
            action_id: "open_modal_button", // TODO: Might wanna generate unique action IDs
          },
        ],
      },
    ],
  });

  const labels = await getProjectLabels();
  const labelsArray = constructLabelOptionArray(labels);
  const issueTypeIds = await getProjectIssueTypes();
  const issueTypeIdsArr = constructIssueTypeIdsArray(issueTypeIds);
  provisionalTicket["labelsArray"] = labelsArray;
  provisionalTicket["issueTypesArray"] = issueTypeIdsArr;
});

// When the user opens the modal, send him the view
app.action("open_modal_button", async ({ ack, body, context }) => {
  ack();
  try {
    await app.client.views.open({
      token: context.botToken,
      trigger_id: body.trigger_id,
      view: {
        callback_id: "ticket_view",
        title: {
          type: "plain_text",
          text: "Create new Jira issue",
        },
        submit: {
          type: "plain_text",
          text: "Create Jira issue",
        },
        blocks: [
          {
            block_id: "ticket_info",
            type: "actions",
            elements: [
              {
                type: "static_select",
                placeholder: {
                  type: "plain_text",
                  text: "Select a ticket label",
                  emoji: true,
                },
                action_id: "label",
                options: provisionalTicket.labelsArray,
              },
              {
                type: "static_select",
                placeholder: {
                  type: "plain_text",
                  text: "Select an issue type",
                  emoji: true,
                },
                action_id: "issueType",
                options: provisionalTicket.issueTypesArray,
              },
            ],
          },
          {
            block_id: "ticket_title",
            type: "input",
            element: {
              type: "plain_text_input",
              action_id: "ticket_title_input",
              placeholder: {
                type: "plain_text",
                text: "Ex: Migrate to tailwind",
              },
              initial_value: provisionalTicket.title,
            },
            label: {
              type: "plain_text",
              text: "Title",
            },
            hint: {
              type: "plain_text",
              text: "The title of the Jira issue",
            },
          },
          {
            block_id: "ticket_description",
            type: "input",
            element: {
              type: "plain_text_input",
              action_id: "ticket_description_input",
              multiline: true,
              placeholder: {
                type: "plain_text",
                text: "Ex: MaterialUI bad, tailwind good",
              },
              initial_value: provisionalTicket.description,
            },
            label: {
              type: "plain_text",
              text: "Description",
            },
            hint: {
              type: "plain_text",
              text: "The description of the Jira issue",
            },
          },
        ],
        type: "modal",
      },
    });
  } catch (error) {
    logger.error("Coudln't open modal", error);
  }
});

// Post the ticket to Jira
app.view("ticket_view", async ({ payload, ack }) => {
  await ack();
  const label = payload.state.values.ticket_info.label.selected_option.value;
  const issueType =
    payload.state.values.ticket_info.issueType.selected_option.value;
  postTicket(
    payload.state.values.ticket_title.ticket_title_input.value,
    payload.state.values.ticket_description.ticket_description_input.value,
    label,
    issueType
  );
});

(async () => {
  // Start your app
  await app.start();

  console.log("GPTJira is running!");
})();
