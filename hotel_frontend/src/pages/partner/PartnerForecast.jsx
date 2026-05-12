import { partnerService } from "../../services/partnerService";
import { PageHeader, Card } from "../../components/admin/AdminLayout";
import { 
} from "lucide-react";



  return "LOW";
}

    };

  return (
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} /> {v.label}
            </div>
          ))}
        </div>
      </div>
        <defs>
            <stop offset="100%" stopColor="#BE1E2E" stopOpacity="0" />
          </linearGradient>
        </defs>
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke={p.color} strokeWidth="2" />
        ))}
            </text>
        ))}
      </svg>
    </div>
  );
}

export default function PartnerForecast() {
  const [hotels, setHotels]   = useState([]);
  const [daysCount, setDaysCount] = useState(14);

  useEffect(() => {
      setLoading(true);
      try {
    load();



  return (
      <PageHeader
      />

          </div>
        </div>
          {[7, 14, 21, 30].map(d => (
            <button key={d} onClick={() => setDaysCount(d)} style={{
            }}>
            </button>
          ))}
        </div>
      </div>

        <div style={{ textAlign: "center", padding: "100px 0" }}>
        </div>
      ) : (
        <>
              </div>
              </div>
              </div>
          </div>


            </div>

              return (
                  </div>

                      </span>
                    </div>
                      </div>
                    </div>
                  </div>
                    </div>
                  </div>
                  </div>

                </div>
          </div>
        </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
