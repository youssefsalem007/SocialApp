import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { userGQLSchema } from "../user";
import { postGQLSchema } from "../post";


const query =  new GraphQLObjectType({
        name: "RootSchemaQuery",
        description: "optional to understand api",
        fields: {
           ...userGQLSchema.registerQuery(),
           ...postGQLSchema.registerQuery()
    
        }
    })


  const mutation = new GraphQLObjectType({
        name: "RootSchemaMutation",
        description: "optional to understand api",
        fields: {
             ...userGQLSchema.registerMutation(),
             ...postGQLSchema.registerMutation()
        }
    })

  export const schema = new GraphQLSchema({query, mutation })

  