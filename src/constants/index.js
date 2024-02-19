import {
  mobile,
  backend,
  creator,
  web,
  javascript,
  typescript,
  html,
  css,
  reactjs,
  redux,
  tailwind,
  nodejs,
  mongodb,
  git,
  figma,
  docker,
  meta,
  starbucks,
  tesla,
  shopify,
  carrent,
  jobit,
  tripguide,
  threejs,
  icuro,
  LetsSolv,
  asdrp, 
  origins,
  LearnToBe,
  CAHSD, 
  usaco,
  colab,
  inspirit,
  drive
} from "../assets";

export const navLinks = [
  {
    id: "about",
    title: "About",
  },
  {
    id: "work",
    title: "Work",
  },
  {
    id: "contact",
    title: "Contact",
  },
];

const services = [
  {
    title: "Machine Learning and Artificial Intelligence",
    icon: backend,
  },
  {
    title: "Software Development and Engineering",
    icon: mobile,
  },
  {
    title: "Web Development",
    icon: web,
  },
  {
    title: "Robotics and Embedded Systems",
    icon: creator,
  },
];

const technologies = [
  {
    name: "HTML 5",
    icon: html,
  },
  {
    name: "CSS 3",
    icon: css,
  },
  {
    name: "JavaScript",
    icon: javascript,
  },
  {
    name: "TypeScript",
    icon: typescript,
  },
  {
    name: "React JS",
    icon: reactjs,
  },
  {
    name: "Redux Toolkit",
    icon: redux,
  },
  {
    name: "Tailwind CSS",
    icon: tailwind,
  },
  {
    name: "Node JS",
    icon: nodejs,
  },
  {
    name: "MongoDB",
    icon: mongodb,
  },
  {
    name: "Three JS",
    icon: threejs,
  },
  {
    name: "git",
    icon: git,
  },
  {
    name: "figma",
    icon: figma,
  },
  {
    name: "docker",
    icon: docker,
  },
];

const experiences = [
  {
    title: "Artificial Intelligence Intern",
    company_name: "ICURO",
    icon: icuro,
    iconBg: "#383E56",
    date: "May 2021 - June 2021",
    points: [
      "Contributed to the development of a showcased robot at the INTEL expo during my internship at ICURO that was tasked with",
      "Acquired proficiency in data collection tools like CVAT and Roboflow, facilitating efficient data labeling.",
      "Utilized the YOLO framework to create an object detection algorithm for the robot.",
      "Played a crucial role in collecting and refining large datasets, essential for building accurate machine learning models.",
    ],
  },
  {
    title: "Software Engineering Intern",
    company_name: "LetsSolv",
    icon: LetsSolv,
    iconBg: "white",
    date: "July 2023 - Sep 2023",
    points: [
      "Developed a sentiment analysis prototype that gauged sentiment from news portals, forums, and Twitter, storing results for dashboard reporting.",
      "Key contributor to user modules, admin functions, and sentiment exploration.",
      "Implemented machine learning models (Vader Lexicon, scikit-Learn, TensorFlow) for enhanced analytical capabilities.",
      "Applied Python, Django, and MySQL skills for a robust sentiment analysis system.",
    ],
  },{
    title: "Web Developer",
    company_name: "USACO",
    icon: usaco,
    iconBg: "white",
    date: "Jan 2024 - Feb 2024",
    points: [
      "Maintain and enhance USACO Guide and CPI websites, addressing bugs and implementing updates.",
      "Utilize React and adapt to technologies like Typescript, TailwindCSS, Gatsby, and Firebase.",
      "Contribute collaboratively through pull requests, actively participating in projects and issue resolution.",
    ],
  },
  {
    title: "Student Researcher",
    company_name: "ASDRP",
    icon: asdrp,
    iconBg: "white",
    date: "Jan 2022 - Present",
    points: [
      "Two-year ASDRP tenure focused on drug development and pharmacokinetics.",
      "Presented innovative findings at SCURR(Southern California Conferences for Undergraduate Research).",
      "Led project involving phosphorus atom extraction from DNA using PyMOL and Python.",
      "Methodology included data extraction from RCSB PDB and MMDB, yielding a dataset of 3,146 molecules.",
      "Developed a structural classification method for DNA Binding Enzymes in Homo sapiens.",
      "Emphasized DNA strand's geometric aspects, revealing common attributes across protein classes.",
      "Implemented methodologies to map specific features for protein family identification.",
      "Research holds promise in biomedical applications, particularly in drug development."
    ],
  },
 {
    title: "CTO",
    company_name: "Origins Customs",
    icon: origins,
    iconBg: "#ffffff",
    date: "April 2023 - Present",
    points: [
      "Current CTO at Ethereal Apparel, overseeing technology for a thriving clothing business.",
      "Manages technological infrastructure and operations, ensuring the seamless functioning of the business website.",
      "Built custom clothes website using vue JS and make bulk shipping orders",
      "5,000 dollars in profit this year",
    ],
  },{
    title: "CTO and Director of Education",
    company_name: "California HS Democrats Chapter",
    icon: CAHSD,
    iconBg: "white",
    date: "March 2023 - Present",
    points: [
      "Currently serving as Chief of Technology, responsible for overseeing and implementing technological solutions.",
      "Simultaneously hold the position of Director of Education, leading a Discord channel focused on educating youth.",
      "The Discord channel aims to inform young individuals about ways to voice their opinions and actively participate in civic matters.",
    ],
  },{
    title: "Tutor",
    company_name: "Learn To Be",
    icon: LearnToBe,
    iconBg: "black",
    date: "Jan 2022 - Present",
    points: [
      "Created engaging learning environment by encouraging questions, sparking discussions.",
      "Planned curriculum based on individual academic needs.",
      "Met with parents to discuss youth progress and potential.",
      "Provided extra support for struggling students by tutoring in Math and Science."
    ],
  }
];

const testimonials = [
  {
    testimonial:
      "I thought it was impossible to make a website as beautiful as our product, but Rick proved me wrong.",
    name: "Sara Lee",
    designation: "CFO",
    company: "Acme Co",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
  },
  {
    testimonial:
      "I've never met a web developer who truly cares about their clients' success like Rick does.",
    name: "Chris Brown",
    designation: "COO",
    company: "DEF Corp",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
  },
  {
    testimonial:
      "After Rick optimized our website, our traffic increased by 50%. We can't thank them enough!",
    name: "Lisa Wang",
    designation: "CTO",
    company: "456 Enterprises",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
  },
];

const projects = [
  {
    name: "Video Sage",
    description:
      "Video Sage is a cutting-edge project aimed at democratizing knowledge through a seamless fusion of technology. Developed with a Flask backend, React frontend, and Firebase database, this groundbreaking tool revolutionizes the learning experience. The project takes in videos (such as college lectures) or PDFs in any language and performs a multi-faceted transformation. It first dubs the video in a selected language, utilizing Assembly AI for transcription and Movie.py along with Azure Text to Speech for audio synthesis. Simultaneously, it extracts intricate notes from the content and generates flashcards for key terms. Not stopping there, Video Sage is evolving with an upcoming premium feature—a sophisticated image generation capability that uses AI to create videos based on the extracted notes. Leveraging YouTube API for video downloads and Assembly AI API for audio transcription with translation into over two dozen languages, Video Sage ensures a global reach. The project doesn't just automate language translation; it employs state-of-the-art technologies like Bart for efficient video summarization and DeepL for language conversion. Furthermore, by integrating Microsoft Azure's Speech Cognitive Services for dubbed audio, Video Sage guarantees accessibility on a global scale. In essence, Video Sage is a comprehensive knowledge democratization tool, transforming traditional content into a dynamic, multilingual, and interactive learning experience.",
    tags: [
      {
        name: "react",
        color: "blue-text-gradient",
      },
      {
        name: "flask",
        color: "green-text-gradient",
      },
      {
        name: "firebase",
        color: "pink-text-gradient",
      },
    ],
    image: carrent,
    source_code_link: "hhttps://drive.google.com/file/d/1Ppdt52xS4Es1CNQXjkCZaEUzj9yw3fYr/view?usp=sharing",
    topRight:drive,
  },
  {
    name: "Object Detection on Street",
    description:
      "I developed an object detection model using the YOLO framework and a CNN, achieving a 90% accuracy rate. I also experimented with expert models such as VGG16, VGG19, ResNet50, and DenseNet121, gaining valuable insights. The model can currently take in and output videos and will be integrated with a live video camera using TensorFlow.js for real-time applications. Its accuracy rate and ability to handle multiple objects make it useful for computer vision, robotics, and autonomous systems. The real-time integration will be interesting to compare with the expert models.",
    tags: [
      {
        name: "YOLO Framework",
        color: "blue-text-gradient",
      },
      {
        name: "TensorFlow.js",
        color: "green-text-gradient",
      },
      {
        name: "Convolutional Neural Network (CNN)",
        color: "pink-text-gradient",
      },
    ],
    image: jobit,
    source_code_link: "https://drive.google.com/file/d/1SsaQTGQ2mifC7w9Isj927ILIBbnZhfkI/view?usp=sharing",
    topRight: colab,
  },
  {
    name: "Video Game User Retention Personal Research Paper under mentorship of MIT Alumna Anjali Singh",
    description:
      "Embarking on a mission to elevate user retention in the dynamic landscape of the video game industry, my personal research paper, conducted under the mentorship of MIT Alumna Anjali Singh at INSPIRIT AI, represents a deep dive into the intersection of player engagement and game difficulty prediction. The primary objective of the research was to optimize player engagement by predicting the optimal game difficulty. This involved a meticulous analysis of player statistics alongside real-time camera footage. The findings of this comprehensive study were presented through a detailed research paper and an accompanying poster. To fuel the investigation, I leveraged Kaggle datasets encompassing facial emotion and real-time Call of Duty player data. The utilization of pre-trained convolutional neural networks, specifically VGG16 and VGG19, on image datasets added a sophisticated layer to the analysis, enabling a nuanced understanding of player dynamics. In the pursuit of precision, various machine learning models were employed, including K-Nearest Neighbors and Decision Trees, applied to the Kaggle Dataset focusing on Call of Duty (COD) players. This intricate amalgamation of models seamlessly integrated emotional cues derived from facial expressions with quantitative player data, presenting a holistic perspective on user engagement. In essence, this research paper represents a comprehensive exploration at the crossroads of player psychology, statistical analysis, and machine learning methodologies, with the ultimate goal of enhancing the user retention strategies within the ever-evolving realm of video game dynamics.",
    tags: [
      {
        name: "CNN",
        color: "blue-text-gradient",
      },
      {
        name: "VGG16",
        color: "green-text-gradient",
      },
      {
        name: "k-nearest Neighbors",
        color: "pink-text-gradient",
      },
    ],
    image: tripguide,
    source_code_link: "https://independent-project-mentorship.netlify.app/projects/61b6744c6bb550e4068d693e1c0ab942d2751c91.html",
    topRight:inspirit,
  },
];

export { services, technologies, experiences, testimonials, projects };
