import Message from '../models/Message'
import { connectToMongo } from '.'
import Post from '../models/Post'
import User from '../models/User'

const seedMessage = async () => {
  await connectToMongo()
  await Message.deleteMany({})

  const post1 = await Post.findOne({
    title: 'Quelle est la meilleure moto pour débuter ?'
  })
  const user1 = await User.findOne({ firstname: 'Alice' })
  const user2 = await User.findOne({ firstname: 'Bob' })

  if (!user1 || !user2 || !post1) {
    throw new Error('Missing seeded data')
  }

  await Message.insertMany([
    {
      content: "Pense aussi au coût de l'assurance",
      isRep: true,
      reference: post1._id,
      referenceModel: 'Post',
      user: user1._id
    }
  ])

  const message = await Message.findOne({
    content: "Pense aussi au coût de l'assurance"
  })
  if (!message) throw new Error('Missing seeded data')

  await Message.insertMany([
    {
      content: "Réponse au cout de l'assurance",
      isRep: true,
      reference: message._id,
      referenceModel: 'Message',
      user: user1._id
    },
    {
      content: "Deuxième Réponse au cout de l'assurance",
      isRep: true,
      reference: message._id,
      referenceModel: 'Message',
      user: user1._id
    }
  ])

  // Messages pour les motos du comparo (posts créés dans seedPost)
  const postGsxr = await Post.findOne({ title: 'GSX-R600' })
  const postCbr = await Post.findOne({ title: 'CBR1000RR-R Fireblade' })
  const postMt07 = await Post.findOne({ title: 'MT-07' })

  if (postGsxr) {
    await Message.insertMany([
      {
        content:
          "Passer d'une routière à la GSX-R, c'est entrer dans une autre dimension. Le moteur offre une sonorité et un couple uniques qui vous collent au fond de la selle à chaque rotation de poignée.",
        like: 31,
        dislike: 0,
        isRep: true,
        reference: postGsxr._id,
        referenceModel: 'Post',
        user: user1._id
      },
      {
        content:
          "C'est tout le paradoxe de la GSX-R : elle est ingérable au quotidien mais absolument sublime dès qu'on lui donne de l'espace.",
        like: 31,
        dislike: 0,
        isRep: true,
        reference: postGsxr._id,
        referenceModel: 'Post',
        user: user2._id
      }
    ])
  }

  if (postCbr) {
    await Message.insertMany([
      {
        content:
          "La Fireblade est une machine exigeante et radicale, presque fatigante en ville, mais une fois sur circuit ou sur une départementale dégagée, l'agilité du train avant et l'électronique de pointe donnent l'impression de ne faire qu'un avec la piste.",
        isRep: true,
        reference: postCbr._id,
        referenceModel: 'Post',
        user: user1._id
      },
      {
        content:
          "Le moteur Crossplane de la CBR1000RR-R offre des sensations uniques. Ce calage moteur particulier donne vraiment ce sentiment de piloter un prototype de MotoGP plutôt qu'une simple moto de série.",
        isRep: true,
        reference: postCbr._id,
        referenceModel: 'Post',
        user: user2._id
      }
    ])
  }

  if (postMt07) {
    await Message.insertMany([
      {
        content:
          "La MT-07 est la moto parfaite pour débuter sans se priver de sensations. Légère, agile, et ce twin qui grogne dès qu'on ouvre les gaz.",
        isRep: true,
        reference: postMt07._id,
        referenceModel: 'Post',
        user: user2._id
      },
      {
        content:
          "Après 3 ans dessus je comprends pourquoi c'est une des motos les plus vendues en Europe. Elle fait tout bien, sans être excellente dans un domaine précis.",
        isRep: true,
        reference: postMt07._id,
        referenceModel: 'Post',
        user: user1._id
      }
    ])
  }

  console.warn('Message seeding')
}

export default seedMessage
