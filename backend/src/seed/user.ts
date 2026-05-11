import User from '../models/User'
import { connectToMongo } from '.'

const seedUser = async () => {
  await connectToMongo()
  await User.deleteMany({})

  await User.insertMany([
    {
      firstname: 'Alice',
      lastname: 'Dupont',
      pseudo: 'AliceD',
      email: 'alice.dupont@motocenter.com',
      password:
        '$argon2id$v=19$m=4096,t=3,p=1$z4FduP43K48SD5qOJU1tTw$KBr3Rbi8qRjENqcWZ6EIkFjMKr5W+z07MYoC1rJuIeo', // hashed version of 'hashed_password_1'
      isAdmin: true,
      userType: 'expert',
      ridingStartYear: 2005,
      createdAt: new Date(),
      image: 'test2.png'
    },
    {
      firstname: 'Bob',
      lastname: 'Martin',
      pseudo: 'BobM',
      email: 'bob.martin@motocenter.com',
      password:
        '$argon2id$v=19$m=4096,t=3,p=1$jZUYZPRQKGGp2fP2Y0nJ3w$lx7CpCsmY2+zZwMkYLZjvDsujnNZDbm/pFgTZV8m3Iw', // hashed version of 'hashed_password_2'
      userType: 'confirmed',
      ridingStartYear: 2015,
      createdAt: new Date(),
      image: 'test1.png'
    },
    {
      firstname: 'Clara',
      lastname: 'Bernard',
      pseudo: 'ClaraB',
      email: 'clara.bernard@motocenter.com',
      password:
        '$argon2id$v=19$m=4096,t=3,p=1$ayB/QgFGv6HAQwhCqvRsEA$44E8CUE6AoWcUlCmLzxS8UjOhH/gmPzkVsv2MK3h5No', // hashed version of 'hashed_password_3'
      userType: 'beginner',
      ridingStartYear: 2023,
      createdAt: new Date(),
      image: 'test4.png'
    },
    {
      firstname: 'David',
      lastname: 'Leroy',
      pseudo: 'DavidL',
      email: 'david.leroy@motocenter.com',
      password:
        '$argon2id$v=19$m=4096,t=3,p=1$gumINsYZGVJFSBtPpV6cuQ$NsI/eio5w0XfLsJ625gBlf6OxZ4f3+1BWZsoyz+xQ+c', // hashed version of 'hashed_password_4'
      userType: 'confirmed',
      ridingStartYear: 2018,
      createdAt: new Date(),
      image: 'test3.png'
    },
    {
      firstname: 'Emma',
      lastname: 'Petit',
      pseudo: 'EmmaP',
      email: 'emma.petit@motocenter.com',
      password:
        '$argon2id$v=19$m=4096,t=3,p=1$mhldbmqlRl6JIp/SALIe8g$nQYvpc29eDxCBgauvxFkn4+fnfMVEp8Tr+qDm6z7Kks', // hashed version of 'hashed_password_5'
      userType: 'other',
      createdAt: new Date(),
      image: 'test4.png'
    },
    {
      firstname: 'MotoCenter',
      lastname: 'MotoCenter',
      pseudo: 'MotoCenter',
      email: 'motocenter@motocenter.com',
      password:
        '$argon2id$v=19$m=4096,t=3,p=1$v8bn6+ztl4x3+udQCSExIg$yH66yo4pbCtk/dm9hP1xLXMo04lPpWeeeKTk5QsV1wk', // hashed version of 'hashed_password_6'
      userType: 'confirmed',
      image: 'motocenter.png'
    }
  ])

  console.log('User seeding')
}

export default seedUser
