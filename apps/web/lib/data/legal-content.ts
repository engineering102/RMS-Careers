/**
 * Public legal policies for www.rms-careers.com, rendered by app/legal/[slug].
 *
 * Inline text may contain **bold** spans; emails and https URLs are auto-linked
 * by the renderer.
 */

export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'h3'; text: string };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalPolicy {
  slug: string;
  title: string;
  description: string;
  sections: LegalSection[];
}

export const LEGAL_LAST_UPDATED = '20 July 2026';
export const LEGAL_CONTACT_EMAIL = 'connect@rms-careers.com';
export const LEGAL_ENTITY_NAME = 'RMS Careers – Rising Mind Solutions';

/** Registered / principal business address. Rendered in contact sections once set. */
export const LEGAL_BUSINESS_ADDRESS: string | null = null;

const p = (text: string): LegalBlock => ({ type: 'p', text });
const ul = (...items: string[]): LegalBlock => ({ type: 'ul', items });
const h3 = (text: string): LegalBlock => ({ type: 'h3', text });

export const legalPolicies: LegalPolicy[] = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    description:
      'How RMS Careers collects, uses, stores, discloses and protects personal information across our website and student portal.',
    sections: [
      {
        heading: 'Introduction',
        blocks: [
          p('RMS Careers – Rising Mind Solutions (“RMS Careers”, “we”, “our” or “us”) is committed to protecting the privacy and personal information of visitors, students, prospective students, institutional partners and other users of our website and student portal.'),
          p('This Privacy Policy explains how we collect, use, store, disclose and protect personal information when you access our website, register for our programs, participate in our training sessions or communicate with us.'),
          p('By using our services, you acknowledge that you have read this Privacy Policy. Where consent is required by applicable law, we will obtain it appropriately.')
        ]
      },
      {
        heading: 'Information We Collect',
        blocks: [
          p('Depending on how you interact with RMS Careers, we may collect the following categories of information:'),
          h3('A. Personal and contact information'),
          ul(
            'Full name, email address and mobile number.',
            'College or institution name, academic details and course of study.',
            'Information submitted through contact forms, registration forms and enquiries.'
          ),
          h3('B. Student and learning information'),
          ul(
            'Course enrolments, attendance and assessment results.',
            'Learning progress, assignments, projects and feedback.',
            'Student portal account details and records of program participation.'
          ),
          h3('C. Payment and transaction information'),
          ul(
            'Course fees, payment status, transaction references and refund records.',
            'Payment information processed through authorised payment service providers.'
          ),
          p('We do not intend to collect or retain complete payment-card credentials or banking authentication details when these are handled by a payment provider.'),
          h3('D. Technical information'),
          ul(
            'IP address, browser type, device information and access logs.',
            'Cookie preferences and website usage information, where applicable.'
          ),
          p('Please do not submit sensitive personal information through general enquiry forms unless specifically requested through an appropriate process.')
        ]
      },
      {
        heading: 'How We Use Your Information',
        blocks: [
          p('We may use personal information to:'),
          ul(
            'Respond to enquiries and provide information about our programs.',
            'Register students and manage enrolments.',
            'Deliver online training, assessments and learning resources.',
            'Monitor learning progress and provide educational feedback.',
            'Process payments, cancellations and eligible refunds.',
            'Communicate schedule changes, program updates and support information.',
            'Coordinate with authorised college or institutional partners where necessary for program delivery.',
            'Maintain website security, prevent misuse and resolve technical issues.',
            'Improve our services and meet applicable legal obligations.'
          ),
          p('We will use personal information for specified, legitimate purposes and obtain consent where required by applicable law.')
        ]
      },
      {
        heading: 'Communications and Marketing',
        blocks: [
          p('We may send service-related messages about enrolment, schedules, assessments, payments and support requests.'),
          p('Promotional emails, messages and other marketing communications will be handled in accordance with applicable law and any required consent or preferences. You may opt out of promotional communications through the available unsubscribe mechanism or by contacting us.'),
          p('Opting out of promotional messages will not necessarily stop essential communications relating to an active enrolment or transaction.')
        ]
      },
      {
        heading: 'Sharing of Information',
        blocks: [
          p('We do not sell personal information to third parties.'),
          p('We may share relevant information with:'),
          ul(
            'Authorised trainers and academic personnel involved in delivering your program.',
            'Partner colleges and institutions, where necessary for agreed program delivery and appropriately authorised.',
            'Payment processors and financial service providers.',
            'Website hosting, cloud infrastructure, email, analytics and other technology providers.',
            'Professional advisers, auditors or public authorities where disclosure is legally required.'
          ),
          p('Such sharing will be limited to what is reasonably necessary for the relevant purpose, subject to applicable law and appropriate safeguards.')
        ]
      },
      {
        heading: 'Data Storage and Security',
        blocks: [
          p('We use reasonable technical and organisational safeguards to protect information against unauthorised access, disclosure, alteration, loss and misuse.'),
          p('Access to student records should be restricted to authorised personnel. We also expect relevant service providers to maintain appropriate security measures.'),
          p('However, no internet-based system can be guaranteed to be completely secure. We cannot promise absolute security of information transmitted over the internet.')
        ]
      },
      {
        heading: 'Data Retention and Deletion',
        blocks: [
          p('We retain personal information only for as long as reasonably necessary to provide our services, maintain academic and transaction records, resolve disputes, comply with legal obligations or establish and defend legal claims.'),
          p('When information is no longer required, we will take appropriate steps to delete or anonymise it, subject to applicable legal retention requirements.'),
          p('You may request access to, correction of or deletion of your personal information, subject to applicable law and legitimate retention obligations.')
        ]
      },
      {
        heading: 'Cookies and Similar Technologies',
        blocks: [
          p('Our website and student portal may use cookies and similar technologies to maintain sessions, remember preferences, improve security and understand website usage.'),
          p('Optional analytics or other non-essential technologies will be managed in accordance with applicable consent requirements. Please refer to our Cookie Policy for further information.')
        ]
      },
      {
        heading: 'Third-Party Services and Links',
        blocks: [
          p('Our website may contain links to external platforms, including payment providers, professional networking websites, learning tools and institutional websites.'),
          p('Those services may have their own privacy practices. RMS Careers is not responsible for the privacy practices of independent third-party websites, and users should review their respective policies.')
        ]
      },
      {
        heading: "Children's and Student Data",
        blocks: [
          p('Our services are primarily intended for college students and individuals seeking career-readiness training.'),
          p('Where personal information of a person who is legally a child is processed, we will follow applicable requirements concerning parental or guardian consent and other protections, as required by law.'),
          p('We encourage users to provide accurate information and to avoid sharing unnecessary personal details.')
        ]
      },
      {
        heading: 'Your Privacy Rights',
        blocks: [
          p('Subject to applicable law, you may have rights to access information about your personal data, request correction or deletion, withdraw consent where processing is based on consent, and raise a grievance.'),
          p('Requests can be sent to connect@rms-careers.com. We may need to verify your identity before processing a request.'),
          p('Withdrawing consent does not affect processing lawfully carried out before withdrawal. It may also affect our ability to provide certain services.')
        ]
      },
      {
        heading: 'Changes to This Policy',
        blocks: [
          p('We may update this Privacy Policy to reflect changes in our services, technology or legal obligations. The revised version will be published on this page with an updated revision date.')
        ]
      },
      {
        heading: 'Contact Us',
        blocks: [p('For privacy-related enquiries, requests or complaints, contact:')]
      }
    ]
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    description:
      'The terms governing access to and use of the RMS Careers website, student portal and training services.',
    sections: [
      {
        heading: 'Introduction',
        blocks: [
          p('Welcome to RMS Careers – Rising Mind Solutions.'),
          p('These Terms & Conditions govern your access to and use of https://www.rms-careers.com/, https://student.rms-careers.com/ and the training, career-readiness and related services offered through our platforms.'),
          p('By accessing our website, creating an account, enrolling in a program or using our services, you agree to these Terms & Conditions and the applicable policies published on our website.'),
          p('If you do not agree with these terms, please do not use the relevant services.')
        ]
      },
      {
        heading: 'About Our Services',
        blocks: [
          p('RMS Careers provides career-readiness and skill-development services designed to help students develop technical knowledge and professional skills.'),
          p('Depending on the program, services may include:'),
          ul(
            'Programming and software-development training.',
            'Data Structures and Algorithms (DSA) preparation.',
            'Web-development and other technology training.',
            'Aptitude and verbal-ability preparation.',
            'Projects, assignments and assessments.',
            'Resume development, LinkedIn guidance and interview preparation.',
            'Career guidance and placement-related support.',
            'Access to online sessions, learning resources and the student portal.'
          ),
          p('The specific features, duration, schedule, deliverables and fees applicable to each program will be communicated through the relevant program description, enrolment information or institutional agreement.')
        ]
      },
      {
        heading: 'Eligibility and Registration',
        blocks: [
          p('You must provide accurate, complete and current information when registering or enrolling.'),
          p('You are responsible for:'),
          ul(
            'Maintaining the confidentiality of your login credentials.',
            'Using your own account and not sharing access without our written permission.',
            'Informing us promptly if you suspect unauthorised account access.',
            'Keeping your contact information up to date.'
          ),
          p('We may restrict or suspend an account where reasonably necessary to address suspected fraud, security risks, misuse or violations of these terms, subject to applicable law.')
        ]
      },
      {
        heading: 'Course Enrolment and Fees',
        blocks: [
          p('Program fees, payment schedules, duration and included services will be communicated before enrolment.'),
          p('Where applicable:'),
          ul(
            'Enrolment may be confirmed only after the required registration and payment steps are completed.',
            'Fees must be paid using the payment methods specified by RMS Careers.',
            'Any applicable taxes and additional charges will be disclosed as required by law.',
            'Promotional offers and discounts are subject to their stated terms.',
            "A student's participation in a program does not automatically entitle them to a job, internship or placement."
          ),
          p('Students should review the program details and Refund & Cancellation Policy before completing payment.')
        ]
      },
      {
        heading: 'Training Delivery and Scheduling',
        blocks: [
          p('Training may be delivered through live online sessions, recorded resources, assignments, projects, assessments or other formats communicated for the program.'),
          p('We may make reasonable changes to trainers, session timings, delivery methods, course materials or schedules where required for operational or educational reasons.'),
          p('Where a material change affects an enrolled student, we will communicate it through the available contact channels and address any applicable refund or cancellation rights under the relevant policy and law.'),
          p('Access to the student portal or particular learning resources may be limited to the duration specified for the program.')
        ]
      },
      {
        heading: 'Student Conduct',
        blocks: [
          p('Students are expected to maintain professional and respectful conduct during classes, assessments, group activities and interactions with trainers, staff and fellow students.'),
          p('You must not:'),
          ul(
            'Harass, threaten, discriminate against or abuse another person.',
            'Disrupt training sessions or assessments.',
            'Submit plagiarised work or impersonate another student.',
            'Cheat, falsify attendance or manipulate assessment results.',
            'Upload malicious software or attempt unauthorised access to our systems.',
            'Use our services for unlawful purposes.',
            'Record, reproduce, distribute or publicly share restricted sessions or learning resources without permission.'
          ),
          p('Violations may result in warnings, removal from a session, suspension of access or termination of enrolment, depending on the circumstances and subject to applicable law.')
        ]
      },
      {
        heading: 'Intellectual Property',
        blocks: [
          p('Unless otherwise stated, the website, branding, logos, course materials, recorded sessions, documents, presentations, learning resources and other original content provided by RMS Careers are owned by or licensed to RMS Careers.'),
          p('Students receive a limited, non-exclusive, non-transferable right to access the materials for their own learning and permitted program activities.'),
          p('You must not reproduce, sell, redistribute, publish, commercially exploit or share restricted materials outside the permitted scope without prior written permission.'),
          p('Students retain any rights they hold in their own original work, subject to applicable law and any separate written agreement. Any permission to showcase student projects or use student testimonials must be handled appropriately and with any consent required by law.')
        ]
      },
      {
        heading: 'Assessments and Certificates',
        blocks: [
          p("Assessments, project reviews and certificates, if offered, are subject to the relevant program's eligibility and completion criteria."),
          p('Enrolment alone does not guarantee a certificate. Where certificates are available, eligibility may depend on attendance, assessment completion, project submissions or other requirements communicated in advance.'),
          p('Students must not misrepresent certificates, assessment results or participation records.')
        ]
      },
      {
        heading: 'Career and Placement Assistance',
        blocks: [
          p('RMS Careers may provide resume support, interview preparation, career guidance, job-search resources and information about employment opportunities.'),
          p('**RMS Careers does not guarantee employment, an internship, a job offer, a specific salary, a particular company selection or placement within a specified period.**'),
          p('Recruitment decisions are made by employers and depend on factors including eligibility, skills, performance, vacancies and employer-specific criteria.'),
          p('Any placement assistance included in a program will be limited to the services expressly described for that program.')
        ]
      },
      {
        heading: 'Third-Party Platforms',
        blocks: [
          p('Our services may reference or integrate with third-party tools, websites or platforms, including learning platforms, video-conferencing services, payment providers and recruitment websites.'),
          p('Your use of such services may be subject to their separate terms and privacy policies. We do not control independent third-party services and cannot guarantee their uninterrupted availability.')
        ]
      },
      {
        heading: 'Service Availability and Limitation of Liability',
        blocks: [
          p('We aim to keep our website, student portal and services available and reliable. However, interruptions may occur due to maintenance, connectivity issues, third-party outages, security incidents or circumstances beyond our reasonable control.'),
          p('To the extent permitted by applicable law, RMS Careers will not be responsible for indirect or consequential losses arising from the use or temporary unavailability of the website or services.'),
          p('Nothing in these terms excludes or limits liability that cannot lawfully be excluded or limited, or removes any non-waivable consumer rights.')
        ]
      },
      {
        heading: 'Suspension and Termination',
        blocks: [
          p('We may suspend or terminate access where necessary because of serious misconduct, fraud, unauthorised access, non-payment or material breach of these terms.'),
          p('Where appropriate, we will provide notice and an opportunity to resolve the issue. Any refund consequences will be determined under the applicable Refund & Cancellation Policy, the enrolment terms and applicable law.')
        ]
      },
      {
        heading: 'Privacy and Refunds',
        blocks: [
          p('Your personal information is handled in accordance with our Privacy Policy.'),
          p('Refund and cancellation requests are governed by our Refund & Cancellation Policy, together with any specific terms disclosed for the relevant program and applicable legal requirements.')
        ]
      },
      {
        heading: 'Changes to These Terms',
        blocks: [
          p('We may revise these terms to reflect changes in our services, operations or legal requirements. Updated terms will be published on this page with a revised date.'),
          p('Changes will apply as permitted by applicable law. Material changes to an existing enrolment will be handled in accordance with the applicable agreement and legal requirements.')
        ]
      },
      {
        heading: 'Governing Law and Disputes',
        blocks: [
          p('These terms are governed by the laws of India.'),
          p("Disputes will be addressed in accordance with applicable Indian law. Nothing in this section limits a consumer's statutory rights or access to a competent consumer dispute-resolution authority.")
        ]
      },
      {
        heading: 'Contact Information',
        blocks: [p('For questions regarding these Terms & Conditions:')]
      }
    ]
  },
  {
    slug: 'refund-and-cancellation-policy',
    title: 'Refund & Cancellation Policy',
    description:
      'How to cancel an enrolment, request a refund and resolve payment issues for RMS Careers programs.',
    sections: [
      {
        heading: 'Introduction',
        blocks: [
          p('This Refund & Cancellation Policy explains the process for cancelling enrolment, requesting refunds and addressing payment-related issues for programs offered by RMS Careers – Rising Mind Solutions.'),
          p('Please review this policy and the applicable program details before making a payment.')
        ]
      },
      {
        heading: 'Scope',
        blocks: [
          p('This policy applies to paid training programs, career-readiness programs and other paid services offered directly by RMS Careers, unless a separate written agreement specifies otherwise, subject to applicable law.'),
          p('For institution-sponsored programs, the relevant college or institutional agreement may also apply. Any student-facing terms must be communicated clearly.')
        ]
      },
      {
        heading: 'Cancellation Before the Program Starts',
        blocks: [
          p('Students who wish to cancel an enrolment before the scheduled program commencement date should email connect@rms-careers.com using their registered email address.'),
          p('The request should include:'),
          ul(
            "Student's full name and registered email address.",
            'Program name and batch details.',
            'Payment date and transaction reference.',
            'Reason for cancellation, if the student wishes to provide one.'
          ),
          p('A cancellation request submitted at least seven calendar days before the program commencement date may qualify for a refund, subject to verification and any clearly disclosed, lawful terms applicable to the enrolment.'),
          p('Requests submitted less than seven calendar days before commencement may be reviewed individually, taking into account services already provided, the published program terms and applicable law.'),
          p('This does not override any mandatory refund rights under applicable law.')
        ]
      },
      {
        heading: 'Cancellation After the Program Starts',
        blocks: [
          p('Once a program has commenced, refunds may depend on the program terms, the portion of the service already delivered, the reason for cancellation and applicable law.'),
          p('Students should submit a written request explaining their circumstances.'),
          p('Non-attendance, a change of personal preference or failure to use available learning resources does not automatically establish eligibility for a full refund. However, this provision does not remove any refund rights that apply by law or under the specific enrolment agreement.'),
          p('Any applicable cancellation charges or deductions must be lawful, reasonable and disclosed where required.')
        ]
      },
      {
        heading: 'Cancellation or Changes by RMS Careers',
        blocks: [
          p('If RMS Careers cancels a program and does not offer an acceptable replacement or rescheduling arrangement, eligible students will be offered an appropriate refund for the undelivered services, subject to applicable law and the enrolment terms.'),
          p("If a session is postponed, rescheduled or affected by a trainer's unavailability, we will communicate the revised arrangements."),
          p("Where an alternative batch or schedule is offered, the student's options will be explained clearly. We will not treat a replacement arrangement as accepted where affirmative agreement is required and has not been obtained.")
        ]
      },
      {
        heading: 'Duplicate, Failed or Incorrect Payments',
        blocks: [
          p('If you are charged more than once for the same enrolment, or a payment is deducted without successful enrolment confirmation, contact connect@rms-careers.com with the transaction reference and relevant details.'),
          p('After verification, any confirmed duplicate or erroneous payment will be processed for reversal or refund through the relevant payment channel.'),
          p('The time taken for the amount to appear in your account may depend on the payment provider or bank.'),
          p('Please do not send passwords, card PINs, CVVs or banking authentication codes by email.')
        ]
      },
      {
        heading: 'Refund Processing',
        blocks: [
          p('Approved refunds will generally be returned through the original payment method wherever practicable.'),
          p('Once approved, we aim to initiate eligible refunds within **7–10 business days**, unless a different period is required by law or communicated for a specific payment method.'),
          p('The time required for the funds to reach your account may vary depending on the payment provider and bank.')
        ]
      },
      {
        heading: 'Non-Refundable Items',
        blocks: [
          p('No item will be declared non-refundable where doing so would conflict with applicable law.'),
          p('Subject to applicable law and the disclosed enrolment terms, fees attributable to services already delivered, completed sessions or resources made available may be considered when determining the eligible refund amount.'),
          p('Any specific non-refundable charges must be disclosed before payment and must be legally permissible.')
        ]
      },
      {
        heading: 'Batch Transfers and Rescheduling',
        blocks: [
          p('Students who cannot attend their assigned batch may contact us to request a transfer to another batch.'),
          p('Approval depends on availability, program structure and the terms communicated for the course. A batch transfer is not guaranteed unless the applicable program terms provide otherwise.'),
          p('Any additional charges or consequences must be communicated before the transfer is confirmed.')
        ]
      },
      {
        heading: 'Refund Request Process',
        blocks: [
          p('To request a refund, email **connect@rms-careers.com** with the subject line “Refund Request – [Program Name]”.'),
          p('Include your name, registered email address, program details, transaction reference and a short explanation of your request.'),
          p('We may contact you for additional information reasonably necessary to verify the enrolment and payment.'),
          p('We will review the request and communicate the decision and any applicable next steps.')
        ]
      },
      {
        heading: 'Grievances and Escalation',
        blocks: [
          p('If you disagree with a refund decision, you may reply to the original email and request a review.'),
          p('We will assess the matter in accordance with the published terms, the facts of the case and applicable law. This process does not limit your statutory consumer rights or access to an appropriate dispute-resolution authority.')
        ]
      },
      {
        heading: 'Changes to This Policy',
        blocks: [
          p('We may update this policy to reflect operational or legal changes. The current version will be published on our website.'),
          p('Changes will not remove rights already available to students under applicable law or binding enrolment terms.')
        ]
      },
      {
        heading: 'Contact Information',
        blocks: [p('Refund and cancellation enquiries:')]
      }
    ]
  },
  {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    description:
      'How RMS Careers uses cookies and similar technologies on our website and student portal, and the choices available to you.',
    sections: [
      {
        heading: 'Introduction',
        blocks: [
          p('This Cookie Policy explains how RMS Careers – Rising Mind Solutions may use cookies and similar technologies on https://www.rms-careers.com/ and https://student.rms-careers.com/.'),
          p('Cookies are small text files stored by a website in a browser or on a device. Similar technologies may help maintain sessions, remember preferences, improve security or understand how a website is used.'),
          p('The actual cookies used by RMS Careers will depend on the website configuration and the third-party services integrated into our platforms.')
        ]
      },
      {
        heading: 'Why We Use Cookies',
        blocks: [
          p('Cookies and similar technologies may be used for the following purposes.'),
          h3('A. Essential Cookies'),
          p('These may be required to:'),
          ul(
            'Maintain secure login sessions.',
            'Support navigation and basic website functionality.',
            'Protect against certain security threats.',
            'Remember choices necessary for a requested service.'
          ),
          p('Essential cookies are used for functionality that cannot reasonably be provided without them.'),
          h3('B. Preference Cookies'),
          p('These may remember selected preferences, such as language or display settings, where such functionality is implemented.'),
          h3('C. Analytics Cookies'),
          p('If analytics tools are enabled, cookies or similar technologies may help us understand website traffic, page usage, navigation patterns and performance.'),
          p('Optional analytics technologies will be managed in accordance with applicable consent requirements.'),
          h3('D. Third-Party Cookies'),
          p('Embedded content or third-party services, such as video platforms, payment integrations or external tools, may use their own cookies or similar technologies.'),
          p("These technologies are subject to the relevant provider's policies and the configuration of our website.")
        ]
      },
      {
        heading: 'Cookie Consent and Your Choices',
        blocks: [
          p('Where required, RMS Careers will seek consent before placing optional cookies or activating non-essential tracking technologies.'),
          p('You may manage available preferences through our cookie settings, if provided. You may also use your browser settings to block or delete cookies.'),
          p('Blocking essential cookies may affect login sessions, student portal access or other website functionality.'),
          p('Withdrawing consent will not make prior consent-based processing unlawful, but it will affect future processing as required by applicable law.')
        ]
      },
      {
        heading: 'Cookie Retention',
        blocks: [
          p('Some cookies are session cookies, which expire when you close your browser. Others may remain on your device for a defined period or until deleted.'),
          p("The retention period depends on the cookie's purpose and configuration. We will provide further details about the actual cookies and their durations through our cookie settings or related disclosures where appropriate.")
        ]
      },
      {
        heading: 'Changes to This Policy',
        blocks: [
          p('We may update this Cookie Policy when our website, technologies or legal obligations change.'),
          p('The revised policy will be published on this page.')
        ]
      },
      {
        heading: 'Contact Us',
        blocks: [p('For questions about cookies or website privacy:')]
      }
    ]
  },
  {
    slug: 'disclaimer',
    title: 'Disclaimer',
    description:
      'Important limitations on the information, training outcomes and career support provided by RMS Careers.',
    sections: [
      {
        heading: 'General Information',
        blocks: [
          p('The information available on https://www.rms-careers.com/ and https://student.rms-careers.com/ is provided by RMS Careers – Rising Mind Solutions for general informational, educational and career-development purposes.'),
          p('We aim to keep the information accurate and useful. However, course descriptions, schedules, learning resources and other website content may change over time.'),
          p('Users should contact us to clarify any material information before making an enrolment or payment decision.')
        ]
      },
      {
        heading: 'Educational and Training Disclaimer',
        blocks: [
          p('RMS Careers provides skill-development and career-readiness training intended to help students improve their technical knowledge, problem-solving ability and professional readiness.'),
          p('Participation in a course does not guarantee mastery of every skill, successful completion of every assessment or achievement of a particular academic or professional outcome.'),
          p("Results depend on several factors, including a student's prior knowledge, effort, attendance, practice and engagement.")
        ]
      },
      {
        heading: 'No Guarantee of Employment or Placement',
        blocks: [
          p('**RMS Careers does not guarantee a job, internship, placement, salary package, promotion, interview call or selection by any employer.**'),
          p('Career guidance, resume assistance, interview preparation and job-search support are intended to assist students in preparing for opportunities.'),
          p('Recruitment outcomes depend on individual performance, employer requirements, market conditions, available vacancies and other factors outside our control.'),
          p('Any salary figures, employment statistics or career-outcome examples displayed on our platforms should be treated according to their stated context and must not be interpreted as guaranteed results.')
        ]
      },
      {
        heading: 'Course Information and Technology',
        blocks: [
          p('Technology tools, frameworks, programming languages, certification requirements and industry practices may change over time.'),
          p('We endeavour to keep our learning content relevant, but we do not guarantee that every resource will always reflect the latest version of every technology or employer requirement.'),
          p('Students should refer to official documentation and applicable certification or examination authorities for current requirements.')
        ]
      },
      {
        heading: 'Third-Party Services and References',
        blocks: [
          p('Our website or training programs may refer to third-party platforms, employers, colleges, certification providers or software tools.'),
          p('Such references are provided for informational or educational purposes unless expressly stated otherwise.'),
          p('A reference to a third party does not, by itself, imply an endorsement, partnership, sponsorship or guarantee. Any actual partnership or affiliation will be described only where appropriately authorised.'),
          p('RMS Careers does not control the content, policies, availability or decisions of independent third-party services.')
        ]
      },
      {
        heading: 'Website Availability and Technical Issues',
        blocks: [
          p('We endeavour to maintain reliable access to our website and student portal. Nevertheless, interruptions may occur because of maintenance, connectivity failures, third-party service issues, cybersecurity incidents or circumstances beyond our reasonable control.'),
          p('We do not guarantee uninterrupted or error-free access at all times.'),
          p('Users should maintain their own copies of important assignments and documents where appropriate and avoid sharing login credentials.')
        ]
      },
      {
        heading: 'No Professional Advice',
        blocks: [
          p('Information on our platforms is not a substitute for individual legal, financial, medical or other regulated professional advice.'),
          p('Users should consult a suitably qualified professional when making decisions that require such advice.')
        ]
      },
      {
        heading: 'Limitation of Responsibility',
        blocks: [
          p('To the extent permitted by applicable law, RMS Careers will not be liable for losses arising from reliance on general information on the website, decisions made independently by third parties or temporary interruptions to online services.'),
          p('Nothing in this disclaimer excludes or limits any liability or consumer right that cannot legally be excluded or limited.')
        ]
      },
      {
        heading: 'Changes to This Disclaimer',
        blocks: [
          p('We may revise this Disclaimer as our services and website evolve. The current version will be published on this page.')
        ]
      },
      {
        heading: 'Contact Us',
        blocks: [p('For questions or clarification regarding this Disclaimer:')]
      }
    ]
  }
];

export function getLegalPolicy(slug: string): LegalPolicy | undefined {
  return legalPolicies.find((policy) => policy.slug === slug);
}
