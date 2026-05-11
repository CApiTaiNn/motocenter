import Brand from '../models/Brand'
import { connectToMongo } from '.'

const seedBrand = async () => {
  await connectToMongo()
  await Brand.deleteMany({})

  await Brand.insertMany([
    {
      name: 'Honda',
      icon: 'https://gt-stickers.com/18267-large_default/autocollant-honda-logo-ailes.jpg'
    },
    {
      name: 'Kawasaki',
      icon: 'https://media.cdnws.com/_i/46016/2928/2689/32/kawasaki-ref34-stickers-moto-casque-scooter-sticker-autocollant-adhesifs.jpeg'
    },
    {
      name: 'Suzuki',
      icon: 'https://autocollant-sticker.com/2036-thickbox_default/logo-suzuki.jpg'
    },
    {
      name: 'Yamaha',
      icon: 'https://i.ebayimg.com/images/g/ivkAAOSwnv9cGl47/s-l400.jpg'
    },
    {
      name: 'BMW',
      icon: 'https://logos-marques.com/wp-content/uploads/2021/02/BMW-Logo-1996.png'
    },
    {
      name: 'Ducati',
      icon: 'https://assets.prd.site.awsducati.com/dist/0.39.4/assets/img/ducati_id.png'
    }
  ])
  console.log('Brand seeding')
}

export default seedBrand
