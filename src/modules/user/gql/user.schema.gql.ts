import { GraphQLString } from "graphql";
import * as UserGQLTypes from './user.types.gql'
import * as UserGQLArgs from './user.args.gql'
import { UserResolver, userResolver } from './user.resolver';

export class UserGQLSchema {
    private readonly userResolver: UserResolver
  constructor() {
    this.userResolver = userResolver
  }

  registerQuery() {
    return {
      profile: {
        description: "profile",
        type: UserGQLTypes.profile,
        args:UserGQLArgs.profile,
        resolve: this.userResolver.profile,
      },
       welcome2: {
        type: GraphQLString,
        description: "say welcome2",
        resolve: () => {
          return "welcome2";
        },
      },
    };
  }

  registerMutation (){
    return {
         like: {
        type: GraphQLString,
        description: "say welcome",
        resolve: () => {
          return "welcome";
        },
      },
    }
  }
}

export const userGQLSchema = new UserGQLSchema()
