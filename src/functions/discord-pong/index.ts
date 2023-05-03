
import { APIGatewayEvent, APIGatewayProxyResultV2 } from 'aws-lambda';

import { APIBaseInteraction, APIChatInputApplicationCommandInteractionData, APIInteractionResponse, InteractionResponseType, InteractionType } from 'discord-api-types/v10';
import { verify } from '@layer/discord-authorizer';


export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2<APIInteractionResponse>> => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ errorMessage: "invalid empty body" })
    };
   }
  if (!await verify(event)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ errorMessage: "invalid signature" })
    };
  }

  const { type, data }: APIBaseInteraction<InteractionType, APIChatInputApplicationCommandInteractionData> = JSON.parse(event.body);

  if ((type === InteractionType.ApplicationCommand || type === InteractionType.ApplicationCommandAutocomplete) && !data) {
    return {
      statusCode: 400,
      body: JSON.stringify({ errorMessage: 'Empty data' })
    };
  }
  if (type === InteractionType.Ping)
    return {
      statusCode: 200,
      body: JSON.stringify({ type: InteractionResponseType.Pong })
    };

  return {
    statusCode: 400,
    body: JSON.stringify({
      type: InteractionResponseType.ChannelMessageWithSource,
      content: `Unknown command ${type}`
    })
  };

}