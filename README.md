# GPTJira
Hacky nodeJS app that allows users to create summarisations of slack threads and Jira tickets out of them 

[Demo video](https://youtu.be/APFjWjmruB0)

Tools used:

- [Slack Bolt API](https://slack.dev/bolt-js/concepts)
- [Jira API](https://developer.atlassian.com/server/jira/platform/rest-apis/)
- [Open AI API](https://platform.openai.com/docs/introduction)

Usage for Jira issue creation based on a thread discussion:

1. Call the bot by mentioning it a Slack thread like so: `@GPTJira`
2. The bot will respond with a message that includes an `Open Modal` button
3. By clicking on the button a modal opens that previews the Jira ticket to be created.
   It includes fields such as `issue type`, `tag`, `title` and `description`.
   The options for `issue type` and `tag` are taken from your Jira workspace and are presented on a dropdown for you to choose.
   The `title` and `description` are already generated based on the conversation that took place on the said Slack thread and they can be edited.
4. By clicking `Create issue` the issue gets added on the Jira board

Usage for simple thread summary:

1. Call the bot by mentioning it in a Slack thread and asking it to summorize like so: `@GPTJira sum` or `@GPTJira summary` or `@GPTJira summarize`
2. The bot will respond with a message that summarizes said thread
