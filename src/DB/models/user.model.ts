import { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { IUser } from "../../common/interfaces";
import {  GenderEnum, ProviderEnum, RoleEnum } from "../../common/enums";
import { generateHash } from "../../common/utils/security/hash.security.js";
import { encrypt } from "../../common/utils/security/encryption.security.js";


const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    slug: {type: String, required: true},
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function (this) {
        return this.provider == ProviderEnum.SYSTEM;
      },
    },
    phone: { type: String },
    profilePicture: { type: String },
    profileCoverPicture: { type: [String] },

    friends: [{type: Types.ObjectId, ref: "User"}],

    gender: { type: Number, enum: GenderEnum, default: GenderEnum.MALE },
    role: { type: Number, enum: RoleEnum, default: RoleEnum.USER },
    provider: {
      type: Number,
      enum: ProviderEnum,
      default: ProviderEnum.SYSTEM,
    },

    changeCredentialsTime: { type: Date },
    DOB: { type: Date },
    deletedAt: {type: Date},
    confirmEmail: { type: Date }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strict: true,
    strictQuery: true,
  },
);

userSchema
  .virtual("userName")
  .set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.firstName = firstName as string;
    this.lastName = lastName as string;
    this.slug = value.replaceAll(/\s+/g, "-")
  })
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  });


    userSchema.pre(["updateOne", "findOneAndUpdate"], function(){

      const update = this.getUpdate() as HydratedDocument<IUser>
      if(update.deletedAt){
        this.setUpdate({...update, $unset: {restoredAt:1}})
      }

      if(update.restoredAt){
        this.setUpdate({...update, $unset: {deletedAt:1}})
        this.setQuery({...this.getQuery(), deletedAt: {$exists: true}})
      }

    const query = this.getQuery()
    if(query.paranoid === false){
      this.setQuery({...query})
    }else{
      this.setQuery({deletedAt: { $exsist: false}, ...query})
    }
  })

  userSchema.pre(["deleteOne", "findOneAndDelete"], function(){
    const query = this.getQuery()
    if(query.force === true){
      this.setQuery({...query})
    }else{
      this.setQuery({deletedAt: { $exsist: true}, ...query})
    }
  })
  
  userSchema.pre("save", async function(this: HydratedDocument<IUser> & {wasNew: boolean}){
    this.wasNew = this.isNew

    if(this.isModified("password")){
      this.password = await generateHash({plainText: this.password})
    }
    if(this.phone && this.isModified("phone")){
      this.phone =  encrypt(this.phone)
    }
  })



export const UserModel = models.User || model<IUser>("User", userSchema);
